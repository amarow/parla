import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VoiceProvider } from './contexts/VoiceContext'
import './index.css'
import App from './App'

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </QueryClientProvider>
  </StrictMode>,
)
