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
import { useRouter } from 'next/navigation';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();

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
        <MDBDropdownItem 
          className="d-flex align-items-center"
          onClick={() => router.push('/profile')}
          style={{ cursor: 'pointer' }}
        >
          <MDBIcon fas icon="user" className="me-2" />
          プロフィール
        </MDBDropdownItem>
        
        <MDBDropdownItem 
          className="d-flex align-items-center"
          onClick={() => router.push('/admin')}
          style={{ cursor: 'pointer' }}
        >
          <MDBIcon fas icon="user-shield" className="me-2" />
          管理者パネル
        </MDBDropdownItem>
        
        <hr className="dropdown-divider" />
        
        <MDBDropdownItem
          className="d-flex align-items-center text-danger"
          onClick={handleSignOut}
          style={{ cursor: 'pointer' }}
        >
          <MDBIcon fas icon="sign-out-alt" className="me-2" />
          ログアウト
        </MDBDropdownItem>
      </MDBDropdownMenu>
    </MDBDropdown>
  );
};

export default UserProfile;

