import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    if (typeof window !== 'undefined') {
      // Add zoom functionality
      const zoomHandler = () => {
        document.querySelectorAll('.zoomable').forEach(img => {
          img.addEventListener('click', (e) => {
            const overlay = document.createElement('div')
            overlay.className = 'zoom-overlay'
            const clone = (e.target as HTMLElement).cloneNode(true) as HTMLElement
            overlay.appendChild(clone)
            document.body.appendChild(overlay)
            
            setTimeout(() => overlay.classList.add('active'), 50)
            
            overlay.onclick = () => {
              overlay.classList.remove('active')
              setTimeout(() => overlay.remove(), 300)
            }
          })
        })
      }

      // Run after page load
      window.addEventListener('load', zoomHandler)
      // Run after route change
      window.addEventListener('hashchange', zoomHandler)
    }
  }
} 