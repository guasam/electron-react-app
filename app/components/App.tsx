import WelcomeKit from '@/lib/welcome/WelcomeKit'
import { Badge } from './ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'
import { Button } from './ui/button'
import '../styles/app.css'

export default function App() {
  return (
    <div>
      <span className="text-red-500">This is good</span>
      <br />
      <Button variant="secondary">This is good</Button>
      <br />
      <Badge>Crazy four</Badge>
      <br />

      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>

      <br />

      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
        <HoverCardContent>The React Framework – created and maintained by @vercel.</HoverCardContent>
      </HoverCard>
    </div>
  )
}
