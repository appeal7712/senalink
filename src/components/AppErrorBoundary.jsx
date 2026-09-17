import { Component } from 'react';

/**
 * 렌더 크래시 폴백.
 * 구글이 이 문구를 사이트링크 스니펫으로 가져가지 않도록 data-nosnippet 유지.
 */
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
      <div
        data-nosnippet
        role="alert"
        style={{
          minHeight: '100vh', background: '#0c0b0a', color: '#e2e8f0',
          padding: 32, fontFamily: 'sans-serif',
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          일시적인 오류가 났습니다
        </p>
        <p style={{ color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
          새로고침 후에도 같으면 아래 내용을 복사해 알려 주세요.
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
