import { supabase } from './supabase';
import { User } from '@/lib/types';

const HELLO_WORLD_CODE = `use stylus_sdk::{
    alloy_primitives::U256,
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct HelloWorld {
        string message;
    }
}

#[public]
impl HelloWorld {
    pub fn initialize(&mut self) {
        self.message.set("Hello, World!".to_string());
    }

    pub fn get_message(&self) -> String {
        self.message.get()
    }

    pub fn set_message(&mut self, new_message: String) {
        self.message.set(new_message);
    }
}`;

const COUNTER_CODE = `use stylus_sdk::{
    alloy_primitives::U256,
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

#[public]
impl Counter {
    pub fn number(&self) -> U256 {
        self.number.get()
    }

    pub fn set_number(&mut self, new_number: U256) {
        self.number.set(new_number);
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