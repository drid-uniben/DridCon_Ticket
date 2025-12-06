import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">

      {/* Illustration */}
      <div className="relative w-72 h-72 mb-6">
        <Image
          src="/404_illustration.png"
          alt="Not found illustration"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
        Page Not Found
      </h1>

      {/* Description */}
      <p className="text-gray-600 mb-8 max-w-md">
        Sorry! The page you're trying to access does not exist or has been moved.
      </p>

      {/* Button */}
      <Link
        href="/"
        className="bg-purple-600 text-white px-6 py-3 rounded-xl shadow-md hover:bg-purple-700 transition-all"
      >
        Go to Registration Page
      </Link>
    </div>
  );
}
