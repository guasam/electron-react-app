import React from 'react'
import ContentStep from '../ContentStep'
import AsterikIcon from '../icons/AsterikIcon'

const ShadContent = () => {
  return (
    <div>
      <h2 className="flex items-center gap-4">Shadcn UI</h2>
      <p>A collection of re-usable components built with Radix UI and Tailwind CSS.</p>
      <p>
        Shadcn UI provides a set of accessible, customizable, and beautiful components that you can copy and paste into
        your apps. It's not a component library, but a collection of re-usable components that you can copy and
        customize.
      </p>
      <div className="welcome-content-steps">
        <ContentStep
          title="Accessible Components"
          description="Built with Radix UI primitives for maximum accessibility"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Customizable"
          description="Copy and paste components into your project and customize them"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Tailwind CSS"
          description="Styled with Tailwind CSS for consistent and modern design"
          icon={AsterikIcon}
        />

        <ContentStep
          title="TypeScript"
          description="Written in TypeScript for better developer experience"
          icon={AsterikIcon}
        />
      </div>
      <p className="learn-more">
        Learn more about Shadcn UI at{' '}
        <a href="https://ui.shadcn.com/" target="_blank" rel="noreferrer">
          ui.shadcn.com
        </a>
      </p>
    </div>
  )
}

export default ShadContent
