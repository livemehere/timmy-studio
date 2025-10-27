import { createRoot } from 'react-dom/client';
import '@renderer/index.css';
import App from '@renderer/App';

createRoot(document.getElementById('root')!).render(<App />);
