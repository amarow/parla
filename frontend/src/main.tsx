import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecorderProvider } from './contexts/Recorder'
import { SessionProvider } from './contexts/SessionContext'
import './index.css'
import App from './App'

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RecorderProvider>
          <App />
        </RecorderProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
