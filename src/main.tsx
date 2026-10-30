import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return{failed:true};}
 render(){return this.state.failed?<main className="fatal"><h1>让我们重新开始这次探索</h1><p>页面遇到了意外情况，你的收藏与参观记录仍保存在当前浏览器中。</p><button onClick={()=>location.reload()}>重新打开博物馆</button></main>:this.props.children;}
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);
