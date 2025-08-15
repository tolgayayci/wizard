import { supabase } from './supabase';
import { User } from '@/lib/types';

const HELLO_WORLD_CODE = `extern crate alloc;

use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct HelloWorld {
        string greeting;
    }
}

#[public]
impl HelloWorld {
    pub fn greet(&self) -> String {
        "Hello, World!".into()
    }
}`;

const COUNTER_CODE = `extern crate alloc;

/// Import items from the SDK. The prelude contains common traits and macros.
use stylus_sdk::{alloy_primitives::U256, prelude::*};

// Define some persistent storage using the Solidity ABI.
// Counter will be the entrypoint.
sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

/// Declare that Counter is a contract with the following external methods.
#[public]
impl Counter {
    /// Gets the number from storage.
    pub fn number(&self) -> U256 {
        self.number.get()
    }

    /// Sets a number in storage to a user-specified value.
    pub fn set_number(&mut self, new_number: U256) {
        self.number.set(new_number);
    }

    /// Sets a number in storage to a user-specified value.
    pub fn mul_number(&mut self, new_number: U256) {
        self.number.set(new_number * self.number.get());
    }

    /// Sets a number in storage to a user-specified value.
    pub fn add_number(&mut self, new_number: U256) {
        self.number.set(new_number + self.number.get());
    }

    pub fn increment(&mut self) {
        let number = self.number.get();
        self.set_number(number + U256::from(1));
    }
}`;

async function createInitialProjects(userId: string) {
  try {
    // Create Hello World project
    const { error: error1 } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: 'Hello World',
        description: 'A simple Hello World smart contract to get started with Stylus',
        code: HELLO_WORLD_CODE,
      });

    if (error1) throw error1;

    // Create Counter project
    const { error: error2 } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: 'Counter',
        description: 'A basic counter smart contract demonstrating state management',
        code: COUNTER_CODE,
      });

    if (error2) throw error2;
  } catch (error) {
    console.error('Error creating initial projects:', error);
    throw error;
  }
}

async function ensureUserRecord(userId: string, email: string) {
  try {
    // First check if user record exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    // If user doesn't exist, create record
    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
        });

      if (insertError) throw insertError;

      // Create initial projects for new user
      await createInitialProjects(userId);
    }

    return true;
  } catch (error) {
    console.error('Error ensuring user record:', error);
    throw error;
  }
}

export async function signInWithMagicLink(email: string) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Magic link error:', error);
    throw error instanceof Error ? error : new Error('Failed to send magic link');
  }
}

export async function signInWithGitHub() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'user:email',
      },
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('GitHub auth error:', error);
    throw error instanceof Error ? error : new Error('Failed to sign in with GitHub');
  }
}

export async function linkIdentity(provider: 'github') {
  try {
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'github' ? 'user:email' : undefined,
      },
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Identity linking error:', error);
    throw error instanceof Error ? error : new Error(`Failed to link ${provider} account`);
  }
}

export async function unlinkIdentity(provider: 'github' | 'email') {
  try {
    const { data, error } = await supabase.auth.unlinkIdentity({
      provider,
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Identity unlinking error:', error);
    throw error instanceof Error ? error : new Error(`Failed to unlink ${provider} account`);
  }
}

export async function handleAuthCallback() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }

    if (data.session?.user) {
      // Ensure user record exists
      await ensureUserRecord(data.session.user.id, data.session.user.email!);
      
      // Check if this is a new user (no projects)
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', data.session.user.id)
        .limit(1);

      if (projectsError) {
        console.error('Error checking projects:', projectsError);
      }

      // If no projects exist, create initial projects
      if (!projects || projects.length === 0) {
        await createInitialProjects(data.session.user.id);
        return { data, error: null, isNewUser: true };
      }
    }

    return { data, error: null, isNewUser: false };
  } catch (error) {
    console.error('Auth callback error:', error);
    throw error instanceof Error ? error : new Error('Authentication failed');
  }
}

// Legacy function - deprecated but kept for backward compatibility
export async function signIn(email: string, password: string) {
  try {
    // First try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If sign in succeeds, user exists and password is correct
    if (signInData.user) {
      await ensureUserRecord(signInData.user.id, signInData.user.email!);
      return { 
        data: signInData, 
        error: null, 
        status: 'success' 
      };
    }

    // If sign in fails, check if it's because user doesn't exist
    if (signInError) {
      // Try to get user by email to check if they exist
      const { data: { users } } = await supabase.auth.admin.listUsers({
        filter: { email }
      });

      // If user exists, it means password was wrong
      if (users && users.length > 0) {
        return { 
          data: null, 
          error: new Error('Email or password is incorrect'),
          status: 'invalid_credentials'
        };
      }

      // If user doesn't exist, create new account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        // If sign up fails with user_already_exists, it means race condition
        // User was created between our check and signup attempt
        if (signUpError.message.includes('user_already_exists')) {
          return {
            data: null,
            error: new Error('Email or password is incorrect'),
            status: 'invalid_credentials'
          };
        }
        throw signUpError;
      }

      // If sign up succeeds, create user record and initial projects
      if (signUpData.user) {
        await ensureUserRecord(signUpData.user.id, signUpData.user.email!);
      }

      return { data: signUpData, error: null, status: 'new_user' };
    }

    // This should never happen but TypeScript wants it
    return {
      data: null,
      error: new Error('An unexpected error occurred'),
      status: 'error'
    };
  } catch (error) {
    console.error('Auth error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
      status: 'error'
    };
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Get user data from users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
      
    if (error) throw error;
    
    // If user record doesn't exist in users table, create it
    if (!data) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      return newUser;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}