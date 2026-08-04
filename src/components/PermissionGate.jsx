import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const PermissionGate = ({ module, action, children }) => {
  const { hasPermission, loading } = useContext(AuthContext);

  if (loading) return null;

  if (hasPermission(module, action)) {
    return <>{children}</>;
  }

  return null;
};

export default PermissionGate;
