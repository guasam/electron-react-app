import React from 'react'
import ContentStep from '../ContentStep'
import AsterikIcon from '../icons/AsterikIcon'

const ReactContent = () => {
  return (
    <div>
      <h2 className="flex items-center gap-4">React</h2>
      <p>React is a declarative, efficient, and flexible JavaScript library for building user interfaces.</p>
      <p>
        It lets you build user interfaces out of individual pieces called components, creating reusable and maintainable
        code for your applications.
      </p>

      <div className="welcome-content-steps">
        <ContentStep
          title="Component-Based"
          description="Build encapsulated components that manage their state for complex UIs"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Declarative"
          description="Create interactive UIs with simple views for each application state"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Learn Once, Write Anywhere"
          description="Develop new features without rewriting existing code"
          icon={AsterikIcon}
        />

        <ContentStep
          title="Virtual DOM"
          description="Lightweight DOM representation for optimal rendering performance"
          icon={AsterikIcon}
        />
      </div>

      <p className="learn-more">
        Learn more about React at{' '}
        <a href="https://reactjs.org/" target="_blank" rel="noreferrer">
          reactjs.org
        </a>
      </p>
    </div>
  )
}

export default ReactContent
