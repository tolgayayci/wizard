#!/bin/sh

# Wizard Backend Resource Monitor
# Monitors and manages system resources to prevent overload

# Configuration
CHECK_INTERVAL=60              # Check every 60 seconds
MEMORY_THRESHOLD=85           # Alert at 85% memory usage
DISK_THRESHOLD=80             # Alert at 80% disk usage
CPU_THRESHOLD=80              # Alert at 80% CPU usage
MAX_CONTAINER_AGE=1800        # Kill idle containers after 30 minutes
LOG_FILE=/opt/wizard-data/logs/monitor.log

# Create log directory if it doesn't exist
mkdir -p $(dirname ${LOG_FILE})

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> ${LOG_FILE}
}

log_message "Resource monitor started"

# Function to get memory usage percentage
get_memory_usage() {
    free | grep Mem | awk '{print int($3/$2 * 100)}'
}

# Function to get disk usage percentage
get_disk_usage() {
    df /opt/wizard-data | awk 'NR==2 {print int($5)}'
}

# Function to get CPU usage percentage
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print int($2)}'
}

# Function to cleanup old Docker resources
cleanup_docker() {
    log_message "Running Docker cleanup"
    
    # Remove stopped containers
    docker container prune -f 2>/dev/null
    
    # Remove unused images
    docker image prune -f 2>/dev/null
    
    # Remove unused volumes (be careful!)
    docker volume prune -f 2>/dev/null
    
    # Remove unused networks
    docker network prune -f 2>/dev/null
    
    # Clean build cache
    docker builder prune -f --keep-storage=1GB 2>/dev/null
}

# Function to cleanup old project files
cleanup_old_projects() {
    log_message "Cleaning up old projects"
    
    # Find and remove projects not modified in 30 days
    find /opt/wizard-data/projects -maxdepth 2 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null
    
    # Clean old build cache
    find /opt/wizard-data/build-cache -type f -mtime +7 -delete 2>/dev/null
    
    # Clean old logs
    find /opt/wizard-data/logs -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null
    find /opt/wizard-data/logs -name "*.gz" -mtime +30 -delete 2>/dev/null
}

# Function to check and kill idle containers
check_idle_containers() {
    # Get list of compiler containers
    CONTAINERS=$(docker ps --filter "name=compiler" --format "{{.ID}} {{.Names}} {{.Status}}")
    
    while IFS= read -r line; do
        if [ -z "$line" ]; then
            continue
        fi
        
        CONTAINER_ID=$(echo $line | awk '{print $1}')
        CONTAINER_NAME=$(echo $line | awk '{print $2}')
        
        # Check if container has been idle
        LAST_LOG=$(docker logs --tail 1 --timestamps $CONTAINER_ID 2>&1 | head -1)
        if [ ! -z "$LAST_LOG" ]; then
            LAST_TIME=$(echo $LAST_LOG | awk '{print $1}')
            # If we can parse the time, check if it's too old
            # This is simplified - in production use proper date parsing
            log_message "Checking container $CONTAINER_NAME for idle timeout"
        fi
    done <<< "$CONTAINERS"
}

# Function to restart unhealthy services
restart_unhealthy_services() {
    # Check backend health
    if ! curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
        log_message "Backend unhealthy, restarting..."
        docker-compose -f /opt/wizard-app/docker-compose.production.yml restart backend
    fi
    
    # Check nginx health
    if ! curl -f -s http://localhost/health > /dev/null 2>&1; then
        log_message "Nginx unhealthy, restarting..."
        docker-compose -f /opt/wizard-app/docker-compose.production.yml restart nginx
    fi
}

# Function to send alert (implement your alerting mechanism)
send_alert() {
    ALERT_TYPE=$1
    MESSAGE=$2
    
    log_message "ALERT [$ALERT_TYPE]: $MESSAGE"
    
    # If email is configured, send alert
    if [ ! -z "$ADMIN_EMAIL" ] && command -v mail > /dev/null 2>&1; then
        echo "$MESSAGE" | mail -s "Wizard Alert: $ALERT_TYPE" $ADMIN_EMAIL
    fi
    
    # If Slack webhook is configured
    if [ ! -z "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"⚠️ **$ALERT_TYPE**: $MESSAGE\"}" \
            $SLACK_WEBHOOK 2>/dev/null
    fi
}

# Main monitoring loop
while true; do
    # Check memory usage
    MEMORY_USAGE=$(get_memory_usage)
    if [ $MEMORY_USAGE -gt $MEMORY_THRESHOLD ]; then
        log_message "High memory usage: ${MEMORY_USAGE}%"
        send_alert "MEMORY" "Memory usage is ${MEMORY_USAGE}% (threshold: ${MEMORY_THRESHOLD}%)"
        
        # Try to free memory
        cleanup_docker
        
        # Force garbage collection in containers
        docker exec wizard-backend sh -c "sync && echo 3 > /proc/sys/vm/drop_caches" 2>/dev/null
    fi
    
    # Check disk usage
    DISK_USAGE=$(get_disk_usage)
    if [ $DISK_USAGE -gt $DISK_THRESHOLD ]; then
        log_message "High disk usage: ${DISK_USAGE}%"
        send_alert "DISK" "Disk usage is ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
        
        # Try to free disk space
        cleanup_old_projects
        cleanup_docker
    fi
    
    # Check CPU usage (simplified check)
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print int(100 - $1)}')
    if [ $CPU_USAGE -gt $CPU_THRESHOLD ]; then
        log_message "High CPU usage: ${CPU_USAGE}%"
        send_alert "CPU" "CPU usage is ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
    fi
    
    # Check container health
    UNHEALTHY=$(docker ps --filter health=unhealthy --format "{{.Names}}" | wc -l)
    if [ $UNHEALTHY -gt 0 ]; then
        log_message "Found $UNHEALTHY unhealthy containers"
        restart_unhealthy_services
    fi
    
    # Check for zombie processes
    ZOMBIES=$(ps aux | grep -c " <defunct>")
    if [ $ZOMBIES -gt 5 ]; then
        log_message "Found $ZOMBIES zombie processes"
        send_alert "PROCESS" "Found $ZOMBIES zombie processes"
    fi
    
    # Check compilation queue (simplified)
    QUEUE_SIZE=$(docker exec wizard-backend sh -c "ls /tmp/compilation-queue 2>/dev/null | wc -l" 2>/dev/null || echo 0)
    if [ $QUEUE_SIZE -gt 20 ]; then
        log_message "Large compilation queue: $QUEUE_SIZE"
        send_alert "QUEUE" "Compilation queue size: $QUEUE_SIZE"
    fi
    
    # Periodic cleanup (every 10 checks = 10 minutes)
    COUNTER=${COUNTER:-0}
    COUNTER=$((COUNTER + 1))
    if [ $((COUNTER % 10)) -eq 0 ]; then
        log_message "Running periodic cleanup"
        cleanup_docker
        check_idle_containers
        COUNTER=0
    fi
    
    # Log current stats every check
    if [ $((COUNTER % 5)) -eq 0 ]; then
        log_message "Stats - Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%, CPU: ${CPU_USAGE}%"
        
        # Log Docker stats
        CONTAINER_COUNT=$(docker ps -q | wc -l)
        log_message "Running containers: $CONTAINER_COUNT"
    fi
    
    # Sleep before next check
    sleep $CHECK_INTERVAL
done