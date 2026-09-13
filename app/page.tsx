import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">AI Speaking Evaluator</h1>
        <p className="text-slate-400">
          Practice your speaking skills with interactive AI scenarios and get real-time feedback.
        </p>

        <div>
          {/* Replaces <SignedOut> */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg shadow transition">
                Sign in with Google
              </button>
            </SignInButton>
          </Show>

          {/* Replaces <SignedIn> */}
          <Show when="signed-in">
            <div className="flex flex-col items-center gap-4">
              <UserButton />
              <Link 
                href="/dashboard" 
                className="w-full py-3 px-6 bg-green-600 hover:bg-green-500 font-semibold rounded-lg shadow transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </Show>
        </div>
      </div>
    </main>
  )
}