import React, { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')
  const [projectName, setProjectName] = useState('')
  const [files, setFiles] = useState<File[]>([])

  // Load available workflows
  useEffect(() => {
    loadWorkflows()
    loadRuns()
  }, [])

  const loadWorkflows = async () => {
    const available = await window.conveyor.workflow.listAvailable()
    setWorkflows(available)
    if (available.length > 0) {
      setSelectedWorkflow(available[0].id)
    }
  }

  const loadRuns = async () => {
    const runList = await window.conveyor.workflow.listRuns()
    setRuns(runList)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const startWorkflow = async () => {
    if (!selectedWorkflow || !projectName) {
      alert('Please enter project name')
      return
    }

    setLoading(true)
    try {
      // Create workflow run
      const { runId } = await window.conveyor.workflow.createRun(selectedWorkflow, {
        projectInfo: {
          name: projectName,
        },
        uploadedFileIds: [],
      })

      // Upload files
      const uploadedFileIds: string[] = []
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const data = new Uint8Array(arrayBuffer)
        const { fileId } = await window.conveyor.workflow.uploadFile(runId, file.name, data)
        uploadedFileIds.push(fileId)
      }

      // Update run with uploaded file IDs
      await window.conveyor.workflow.createRun(selectedWorkflow, {
        projectInfo: {
          name: projectName,
        },
        uploadedFileIds,
      })

      // Execute workflow
      await window.conveyor.workflow.execute(runId)

      alert('Workflow completed successfully!')
      loadRuns()
    } catch (error: any) {
      alert(`Workflow failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Workflow Management</h1>

      {/* Start New Workflow */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Start New Workflow</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="workflow-select">Workflow Type</Label>
            <select
              id="workflow-select"
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div>
            <Label htmlFor="file-upload">Upload Supporting Documents</Label>
            <Input id="file-upload" type="file" multiple onChange={handleFileChange} />
            {files.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">{files.length} file(s) selected</p>
            )}
          </div>

          <Button onClick={startWorkflow} disabled={loading} className="w-full">
            {loading ? 'Running...' : 'Start Workflow'}
          </Button>
        </div>
      </Card>

      {/* Workflow Runs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Workflow Runs</h2>

        {runs.length === 0 ? (
          <p className="text-gray-500">No workflow runs yet</p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="border p-4 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{run.workflowId}</p>
                    <p className="text-sm text-gray-500">
                      Status: <span className="font-semibold">{run.status}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-sm">
                    {run.status === 'completed' && (
                      <span className="text-green-600">✓ Completed</span>
                    )}
                    {run.status === 'running' && (
                      <span className="text-blue-600">⟳ Running</span>
                    )}
                    {run.status === 'failed' && (
                      <span className="text-red-600">✗ Failed</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
