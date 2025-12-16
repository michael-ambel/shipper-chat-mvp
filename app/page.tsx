export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-black">Welcome to Chat MVP</h1>
        <p className="text-gray-700">Real-time chat application</p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/signup"
            className="inline-block px-6 py-3 border border-black text-black rounded-lg hover:bg-gray-100 transition-colors"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
