import { Route, Routes } from 'react-router-dom';
import BlockPreview from './pages/BlockPreview';
import CategoryBlocks from './pages/CategoryBlocks';
import Home from './pages/Home';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/category/:category" element={<CategoryBlocks />} />
      <Route
        path="/preview/:category/:subcategory/:name"
        element={<BlockPreview />}
      />
    </Routes>
  );
}

export default App;
