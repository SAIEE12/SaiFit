import { useState, useCallback } from 'react';

/**
 * Reusable Custom Hook for Managing Dialog Alerts
 */
export default function useDialog() {
  const [dialog, setDialog] = useState({
    visible: false,
    title: '',
    description: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: null
  });

  const showDialog = useCallback((
    title, 
    description, 
    type = 'info', 
    onConfirm = null, 
    onCancel = null, 
    confirmText = 'OK', 
    cancelText = 'Cancel'
  ) => {
    setDialog({
      visible: true,
      title,
      description,
      type,
      confirmText,
      cancelText,
      onConfirm: () => {
        setDialog(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: onCancel ? () => {
        setDialog(prev => ({ ...prev, visible: false }));
        onCancel();
      } : null
    });
  }, []);

  const hideDialog = useCallback(() => {
    setDialog(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    dialog,
    showDialog,
    hideDialog
  };
}
