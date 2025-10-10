import React, { useEffect, useState } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { X, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error'
  message?: string
  progress?: number
  version?: string
}

export function UpdateNotification() {
  const { updater } = useConveyor()
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Register for update status events
    const unsubscribe = updater.onUpdateStatus((event, data) => {
      console.log('Update status received:', data)

      const { status, data: statusData } = data

      switch (status) {
        case 'checking':
          setUpdateStatus({
            status: 'checking',
            message: statusData?.message || 'Checking for updates...'
          })
          setIsVisible(true)
          // Auto-hide after 3 seconds if still checking
          setTimeout(() => {
            setUpdateStatus(prev => {
              if (prev.status === 'checking') {
                setIsVisible(false)
                return { status: 'idle' }
              }
              return prev
            })
          }, 3000)
          break

        case 'available':
          setUpdateStatus({
            status: 'available',
            message: statusData?.message || 'A new update is available!',
            version: statusData?.version
          })
          setIsVisible(true)
          break

        case 'downloading':
          setUpdateStatus({
            status: 'downloading',
            message: 'Downloading update...',
            progress: statusData?.progress || 0
          })
          setIsVisible(true)
          break

        case 'downloaded':
          setUpdateStatus({
            status: 'downloaded',
            message: statusData?.message || 'Update downloaded successfully!'
          })
          setIsVisible(true)
          break

        case 'installing':
          setUpdateStatus({
            status: 'installing',
            message: statusData?.message || 'Installing update, app will restart...'
          })
          setIsVisible(true)
          break

        case 'error':
          setUpdateStatus({
            status: 'error',
            message: statusData?.message || 'Failed to update'
          })
          setIsVisible(true)
          break

        default:
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [updater])

  const handleCheckForUpdates = () => {
    updater.checkForUpdates()
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 max-w-sm w-full animate-in slide-in-from-top-5 duration-300">
      <div className="bg-background border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {updateStatus.status === 'checking' && (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="font-medium text-sm">Checking for Updates</span>
              </>
            )}
            {updateStatus.status === 'available' && (
              <>
                <Download className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">Update Available</span>
              </>
            )}
            {updateStatus.status === 'downloading' && (
              <>
                <Download className="h-4 w-4 animate-pulse text-blue-500" />
                <span className="font-medium text-sm">Downloading Update</span>
              </>
            )}
            {updateStatus.status === 'downloaded' && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">Update Ready</span>
              </>
            )}
            {updateStatus.status === 'installing' && (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="font-medium text-sm">Installing Update</span>
              </>
            )}
            {updateStatus.status === 'error' && (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">Update Error</span>
              </>
            )}
          </div>
          {updateStatus.status !== 'installing' && (
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {updateStatus.message}
          </p>

          {updateStatus.version && updateStatus.status === 'available' && (
            <p className="text-xs text-muted-foreground mt-1">
              Version: {updateStatus.version}
            </p>
          )}

          {updateStatus.status === 'downloading' && updateStatus.progress !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${updateStatus.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(updateStatus.progress)}% complete
              </p>
            </div>
          )}

          {updateStatus.status === 'downloaded' && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                The update will be installed when you restart the app.
              </p>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => window.location.reload()}
              >
                Restart Now
              </button>
            </div>
          )}

          {updateStatus.status === 'error' && (
            <button
              className="text-xs text-primary hover:underline mt-2"
              onClick={handleCheckForUpdates}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}