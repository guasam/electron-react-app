import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { UpdateNotification } from '@/app/components/UpdateNotification'
import LoginPage from '@/app/pages/LoginPage'
import HomePage from '@/app/pages/HomePage'
import { WorkflowsPage } from '@/app/pages/WorkflowsPage'
import './styles/app.css'

export default function App() {
  return (
    <BrowserRouter>
      <UpdateNotification />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
