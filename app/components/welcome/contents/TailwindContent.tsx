import React from 'react'
import ContentStep from '../ContentStep'
import AsterikIcon from '../icons/AsterikIcon'

const TailwindContent = () => {
  return (
    <div>
      <h2 className="flex items-center gap-4">Tailwind CSS</h2>
      <p>A utility-first CSS framework for rapidly building custom user interfaces.</p>
      <p>
        Tailwind CSS provides low-level utility classes that let you build completely custom designs without ever
        leaving your HTML, resulting in faster development and cleaner code.
      </p>

      <div className="welcome-content-steps">
        <ContentStep
          title="Utility First"
          description="Apply pre-defined utility classes directly in your markup"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Component Driven"
          description="Extract reusable components for a consistent design system"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Customizable"
          description="Extend Tailwind CSS with custom utilities and themes"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Performance"
          description="Optimize your CSS for better performance with Tailwind's built-in tools"
          icon={AsterikIcon}
        />
      </div>

      <p className="learn-more">
        Learn more about Tailwind CSS at{' '}
        <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer">
          tailwindcss.com
        </a>
      </p>
    </div>
  )
}

export default TailwindContent
