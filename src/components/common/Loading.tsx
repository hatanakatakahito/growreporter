'use client';

import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

/**
 * 統一されたローディングアニメーションコンポーネント
 * Material-UIのCircularProgressを使用
 */

interface LoadingProps {
  size?: number;
  thickness?: number;
  className?: string;
}

export default function Loading({ 
  size = 40, 
  thickness = 4,
  className = ''
}: LoadingProps) {
  return (
    <Box 
      sx={{ display: 'flex' }} 
      className={className}
    >
      <CircularProgress size={size} thickness={thickness} />
    </Box>
  );
}

