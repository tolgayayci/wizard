# Features

Wizard provides a complete development environment for Arbitrum Stylus smart contracts. From writing code to deploying contracts, every step is streamlined and accessible directly in your browser.

<div class="intro-image">
  <img class="dark-only zoomable" src="/images/main-dark.png" alt="Wizard IDE Dark Theme">
  <img class="light-only zoomable" src="/images/main-light.png" alt="Wizard IDE Light Theme">
</div>

::: tip Zero Setup Required
Start building Stylus smart contracts instantly - no installation, no configuration, just open and code.
:::

::: info Key Features at a Glance
- 📝 Professional code editor with Stylus support
- ⚙️ Secure remote compilation service
- 🚀 One-click deployments with pre-funded wallet
- 🔄 Interactive contract testing interface
- 🔗 Public contract sharing
- 🛡️ Secure infrastructure
:::

## 📝 Smart Contract Editor

Built on VS Code's Monaco Editor, optimized for Stylus smart contract development.

<img class="dark-only zoomable" src="/images/features/editor-dark.png" alt="Editor Dark Theme">
<img class="light-only zoomable" src="/images/features/editor-light.png" alt="Editor Light Theme">

- 🎨 **Rust & Stylus Support** - Full syntax highlighting with Stylus SDK integration
- 🔍 **Smart Autocompletion** - SDK macros, traits, and parameter hints
- ⚡ **One-Click Actions** - Compile, deploy, and test directly from editor
- 🔄 **Development Tools** - Error detection, formatting, and code navigation

::: tip Editor Experience
Get the power of VS Code directly in your browser with command palette, multi-cursor editing, and more.
:::

## ⚙️ Compilation Service

Compile your Rust contracts securely through our dedicated compilation service.

- 🚀 **Remote Compilation** - Powerful backend service handles compilation
- 🔍 **Detailed Error Messages** - Clear, actionable feedback with line-by-line diagnostics
- ⚡ **Fast Processing** - Optimized compilation pipeline for quick results
- 🛡️ **Secure Processing** - Your code is processed in isolated environments

<div class="feature-grid">
  <div>
    <h4>Standard Output</h4>
    <img class="dark-only zoomable" src="/images/features/stdout-dark.png" alt="Standard Output Dark">
    <img class="light-only zoomable" src="/images/features/stdout-light.png" alt="Standard Output Light">
  </div>
  <div>
    <h4>Standard Error</h4>
    <img class="dark-only zoomable" src="/images/features/stderr-dark.png" alt="Standard Error Dark">
    <img class="light-only zoomable" src="/images/features/stderr-light.png" alt="Standard Error Light">
  </div>
</div>

::: warning First Compilation
Initial compilation may take up to 30 seconds as the compiler warms up. Subsequent compilations will be faster.
:::

::: info How it Works
Your code is securely sent to our dedicated compilation service, which handles the complex Rust to Stylus bytecode compilation process. Results are returned within seconds, including detailed diagnostics and optimization suggestions.
:::

## 🚀 Deployment

Deploy your contracts to Arbitrum Stylus with a single click.

- 💳 **Pre-funded Deployment** - No wallet needed
- 📝 **Project Management** - View deployed contracts inside of projects
- 🔍 **Code History** - Access the exact code used for each deployment
- 📜 **Transaction History** - Track all your deployments on Arbitrum Sepolia

<div class="deployment-image">
  <img class="dark-only zoomable" src="/images/features/deploy-dark.png" alt="Deployment Dark Theme">
  <img class="light-only zoomable" src="/images/features/deploy-light.png" alt="Deployment Light Theme">
</div>

::: warning Deployment Issues
If you encounter errors like "ABI not found" after successful compilation during deployment, this might be related to version mismatches or other configuration issues. Please [open an issue](https://github.com/tolgayayci/wizard/issues/new) on our GitHub repository with your contract code and error details so we can help investigate.
:::

## 🔄 Contract Interface

Interact with your deployed smart contracts through an automatically generated interface.

- 🎮 **Auto-generated ABI Interface** - Available immediately after deployment
- 📝 **Method Interaction** - Call your contract functions directly on Arbitrum Sepolia
- 💳 **Pre-funded Transactions** - Execute contract calls using our wallet system
- 📊 **Execution History** - View all call history and outputs in a dedicated panel

<div class="feature-grid">
  <div>
    <h4>Contract Interface</h4>
    <img class="dark-only zoomable" src="/images/features/interface-dark.png" alt="Contract Interface Dark">
    <img class="light-only zoomable" src="/images/features/interface-light.png" alt="Contract Interface Light">
  </div>
  <div>
    <h4>Execution History</h4>
    <img class="dark-only zoomable" src="/images/features/history-dark.png" alt="Execution History Dark">
    <img class="light-only zoomable" src="/images/features/history-light.png" alt="Execution History Light">
  </div>
</div>

::: info No Wallet Required
All contract interactions are handled through our pre-funded wallet system - no need to connect your own wallet or manage testnet funds.
:::

## 🔗 Sharing

Share your smart contracts with the community or keep them private.

- 🔗 **Shareable Links** - Generate unique URLs for your contracts
- 👀 **View Analytics** - Track how many developers viewed your shared contracts
- 🔒 **Access Control** - Toggle sharing on/off at any time
- 👤 **Developer Attribution** - Your email displayed as a badge on shared contracts

<div class="sharing-image">
  <img class="dark-only zoomable" src="/images/features/share-dark.png" alt="Share Interface Dark">
  <img class="light-only zoomable" src="/images/features/share-light.png" alt="Share Interface Light">
</div>

::: info Shared View Features
When someone views your shared contract, they get read-only access to:
- Contract source code
- Compilation interface
- Contract interface
- Deployment details
:::

::: tip Sharing Controls
- Public links can be accessed by anyone
- View sharing status in contract page
- Disable sharing instantly when needed
- Track engagement with view counters
:::

## 🛡️ Security Features

Your code and data are handled securely through our infrastructure.

- 🔐 **Secure Storage** - Your code is encrypted and stored safely in our database
- 🌐 **Protected Sharing** - Code sharing handled through secure external servers
- 💳 **Pre-funded System** - No wallet connection needed, using our secure wallet infrastructure
- 🛡️ **Network Security** - Exclusively supporting Arbitrum Sepolia testnet for enhanced security

::: info Testnet Only
For security reasons, Wizard currently only supports Arbitrum Sepolia testnet. This ensures a safe environment for smart contract development and testing.
:::

::: tip Get Started
Ready to build? [Launch Wizard](https://thewizard.app) and start coding your first Stylus contract!
::: 