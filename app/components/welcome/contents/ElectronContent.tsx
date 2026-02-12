import React from 'react'
import ContentStep from '../ContentStep'
import AsterikIcon from '../icons/AsterikIcon'

const ElectronContent = () => {
  return (
    <div>
      <h2 className="flex items-center gap-4">Electron</h2>
      <p>With the power of modern Chromium, Electron gives you an unopinionated blank slate to build your app.</p>
      <p>
        Choose to integrate your favourite libraries and frameworks from the front-end ecosystem, or carve your own path
        with bespoke HTML code.
      </p>

      <div className="welcome-content-steps">
        <ContentStep
          title="Web Technologies"
          description="Electron embeds Chromium and Node.js to enable devs to build desktop apps"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Cross-Platform"
          description="Build cross-platform desktop applications with ease using Electron"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Open Source"
          description="Electron is an open source project maintained by the community"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Native APIs"
          description="Access native APIs with ease using Electron's built-in modules"
          icon={AsterikIcon}
        />
      </div>

      <p className="learn-more">
        Learn more about Electron at{' '}
        <a href="https://www.electronjs.org/" target="_blank" rel="noreferrer">
          electronjs.org
        </a>
      </p>
    </div>
  )
}

export default ElectronContent
