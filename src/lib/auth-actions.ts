'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInWithPassword(email: string, password: string) {
  console.log('🔐 SERVER ACTION: Starting login for:', email)
  
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log('📊 SERVER ACTION: Login result:', {
    hasData: !!data,
    hasSession: !!data?.session,
    hasUser: !!data?.user,
    error: error?.message
  })

  if (error) {
    console.error('❌ SERVER ACTION: Login error:', error)
    return { error: error.message }
  }

  if (!data?.session) {
    console.error('❌ SERVER ACTION: No session created')
    return { error: 'No session created' }
  }

  console.log('✅ SERVER ACTION: Login successful, redirecting...')
  
  // Redirect on the server side
  redirect('/programs')
}

export async function signOut() {
  console.log('🚪 SERVER ACTION: Starting logout')
  
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('❌ SERVER ACTION: Logout error:', error)
    return { error: error.message }
  }

  console.log('✅ SERVER ACTION: Logout successful, redirecting...')
  
  // Redirect to login
  redirect('/auth/login')
}
