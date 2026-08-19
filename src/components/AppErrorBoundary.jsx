import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', background: '#0c0b0a', color: '#e2e8f0',
        padding: 32, fontFamily: 'sans-serif',
      }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>화면을 그리다가 멈췄습니다</h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
          아래를 복사해서 채팅에 붙여넣으면 바로 고칠 수 있습니다.
        </p>
        <pre style={{
          whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12,
          background: '#161616', padding: 16, borderRadius: 12,
        }}>
          {String(this.state.err?.stack || this.state.err?.message || this.state.err)}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 16, padding: '10px 16px', borderRadius: 8,
            border: 'none', fontWeight: 800, cursor: 'pointer',
          }}
        >
          새로고침
        </button>
      </div>
    );
  }
}
