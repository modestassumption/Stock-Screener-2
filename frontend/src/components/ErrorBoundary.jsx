import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#2d0000', color: '#ffaaaa', fontFamily: 'monospace', minHeight: '100vh', whiteSpace: 'pre-wrap' }}>
          <h2>Something went wrong in React.</h2>
          <div id="error-message" style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
            {this.state.error && this.state.error.toString()}
          </div>
          <div>{this.state.errorInfo && this.state.errorInfo.componentStack}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
