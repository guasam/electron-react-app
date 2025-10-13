import { ThemeSwitcher } from '@/app/components/ThemeSwitcher'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

export default function HomePage() {
  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-foreground text-xs font-bold text-background">
            V
          </div>
          <span className="text-sm font-semibold">Dashboard</span>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl text-center">
          <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Welcome to Your
            <br />
            Dashboard
          </h1>
          <p className="mx-auto mb-8 max-w-md text-sm text-muted-foreground sm:text-base">
            You're all set. Start building something amazing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              className="group h-10 bg-foreground px-6 text-sm font-medium text-background transition-all hover:bg-foreground/90"
              onClick={() => console.log('Get started clicked')}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              variant="outline"
              className="h-10 px-6 text-sm font-medium transition-all hover:bg-accent"
              onClick={() => console.log('Learn more clicked')}
            >
              Learn More
            </Button>
          </div>

          {/* Stats or Features */}
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="text-2xl font-semibold">Fast</div>
              <p className="text-xs text-muted-foreground">
                Lightning-fast performance
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-semibold">Secure</div>
              <p className="text-xs text-muted-foreground">
                Enterprise-grade security
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-semibold">Scalable</div>
              <p className="text-xs text-muted-foreground">
                Built to grow with you
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        Built with Electron, React, and TypeScript
      </footer>
    </div>
  )
}
