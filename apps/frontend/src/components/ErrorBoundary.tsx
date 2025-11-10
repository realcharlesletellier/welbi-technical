import React, { Component, ReactNode } from 'react'
import { Box, Typography, Card, CardContent } from '@testwelbi/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * ErrorBoundary component to catch and handle React rendering errors
 * Provides a fallback UI when component errors occur
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Box style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
          <Card $variant="primary">
            <CardContent>
              <Typography $variant="h4" $gutterBottom style={{ color: '#dc2626' }}>
                ⚠️ Something went wrong
              </Typography>
              <Typography $variant="body1" $gutterBottom>
                An unexpected error occurred. We apologize for the inconvenience.
              </Typography>
              
              {this.state.error && (
                <Box style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  backgroundColor: '#fee2e2', 
                  borderRadius: '4px',
                  border: '1px solid #fecaca'
                }}>
                  <Typography $variant="body2" style={{ 
                    fontFamily: 'monospace', 
                    color: '#991b1b',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.error.message}
                  </Typography>
                </Box>
              )}

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Box style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <Typography $variant="body2" style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Box>
              )}

              <Box style={{ marginTop: '24px' }}>
                <button 
                  onClick={this.handleReset} 
                  style={{ 
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  ← Return to Home
                </button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )
    }

    return this.props.children
  }
}
