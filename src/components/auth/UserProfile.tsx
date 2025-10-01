'use client';

import React from 'react';
import {
  MDBCard,
  MDBCardBody,
  MDBBtn,
  MDBIcon,
  MDBDropdown,
  MDBDropdownToggle,
  MDBDropdownMenu,
  MDBDropdownItem
} from 'mdb-react-ui-kit';
import { useAuth } from '@/lib/auth/authContext';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <MDBDropdown>
      <MDBDropdownToggle
        tag="button"
        className="btn btn-light d-flex align-items-center"
      >
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="プロフィール"
            className="rounded-circle me-2"
            style={{ width: '32px', height: '32px' }}
          />
        )}
        <span className="me-2">{user.displayName || user.email}</span>
        <MDBIcon fas icon="chevron-down" />
      </MDBDropdownToggle>

      <MDBDropdownMenu>
        <MDBDropdownItem className="d-flex align-items-center">
          <MDBIcon fas icon="user" className="me-2" />
          プロフィール
        </MDBDropdownItem>
        
        <MDBDropdownItem className="d-flex align-items-center">
          <MDBIcon fas icon="cog" className="me-2" />
          設定
        </MDBDropdownItem>
        
        <MDBDropdownItem className="d-flex align-items-center">
          <MDBIcon fas icon="link" className="me-2" />
          API接続管理
        </MDBDropdownItem>
        
        <hr className="dropdown-divider" />
        
        <MDBDropdownItem
          className="d-flex align-items-center text-danger"
          onClick={handleSignOut}
        >
          <MDBIcon fas icon="sign-out-alt" className="me-2" />
          ログアウト
        </MDBDropdownItem>
      </MDBDropdownMenu>
    </MDBDropdown>
  );
};

export default UserProfile;

