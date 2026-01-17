export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-gray-900">Gather</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="/about" className="hover:text-gray-700">About</a>
            <a href="/privacy" className="hover:text-gray-700">Privacy</a>
            <a href="/terms" className="hover:text-gray-700">Terms</a>
            <a href="/help" className="hover:text-gray-700">Help</a>
          </div>
          
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Gather. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
