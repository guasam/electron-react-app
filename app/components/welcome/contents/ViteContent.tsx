import React from 'react'
import ContentStep from '../ContentStep'
import AsterikIcon from '../icons/AsterikIcon'

const ViteContent = () => {
  return (
    <div>
      <h2 className="flex items-center gap-4">Electron Vite</h2>
      <p>Combine Electron's desktop capabilities with Vite's lightning-fast development experience.</p>
      <p>
        This powerful combination delivers exceptional developer experience with instant HMR, while allowing you to
        build feature-rich desktop applications.
      </p>

      <div className="welcome-content-steps">
        <ContentStep
          title="Vite Powered"
          description="Inherit all the benefits of Vite and use the same way as Vite"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Optimize Asset Handling"
          description="Optimize asset handling for Electron main process and renderer process"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Source Code Protection"
          description="Compile to V8 bytecode to protect source code"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Pre-configured"
          description="Pre-configured for Electron, don't worry about configuration"
          icon={AsterikIcon}
        />
      </div>

      <p className="learn-more">
        Learn more about Electron Vite at{' '}
        <a href="https://electron-vite.org/guide/" target="_blank" rel="noreferrer">
          electron-vite.org
        </a>
      </p>
    </div>
  )
}

export default ViteContent
