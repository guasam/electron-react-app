import { useState } from 'react'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Button } from '@/app/components/ui/button'
import { ThemeSwitcher } from '@/app/components/ThemeSwitcher'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const navigate = useNavigate()

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = 'Please enter your email'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!password) {
      newErrors.password = 'Please enter your password'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // TODO: Add authentication logic here
    console.log('Login attempt:', { email, password })

    setIsLoading(false)
    // For now, just navigate to home
    navigate('/home')
  }

  return (
    <div className="relative flex h-full items-center justify-center bg-background p-4">
      {/* Theme switcher in top right corner */}
      <div className="absolute right-6 top-6">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-[340px]">
        {/* Logo/Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: undefined })
              }}
              className={`h-10 border-border bg-transparent text-sm transition-colors focus:border-foreground ${
                errors.email ? 'border-red-500' : ''
              }`}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Password
              </Label>
              <button
                type="button"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => console.log('Forgot password clicked')}
              >
                Forgot?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: undefined })
              }}
              className={`h-10 border-border bg-transparent text-sm transition-colors focus:border-foreground ${
                errors.password ? 'border-red-500' : ''
              }`}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            className="group h-10 w-full bg-foreground text-sm font-medium text-background transition-all hover:bg-foreground/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        {/* Sign up link */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              className="font-medium text-foreground transition-colors hover:text-muted-foreground"
              onClick={() => console.log('Sign up clicked')}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
