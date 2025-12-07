"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 pt-10 text-center">

      {/* DridCon Branding */}
      <div className="flex items-start flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="DridCon Logo"
          width={80}
          height={80}
          className="mb-3"
        />

        <h2 className="text-3xl font-bold text-gray-900">DridCon</h2>
        <p className="text-gray-600 text-sm max-w-sm mt-1">
          Making ticketing simple, fast, and seamless for everyone.
        </p>
      </div>

      {/* Illustration */}
      <div className="relative w-64 h-64 mb-6">
        <Image
          src="/404_illustration.png"
          alt="Not found illustration"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
        Oops! Page Not Found
      </h1>

      {/* Description */}
      <p className="text-gray-600 mb-8 max-w-md text-sm md:text-base">
        Looks like you’ve reached a page that doesn’t exist.  
        This might have happened because the link is broken, expired, or mistyped.
      </p>

      {/* Buttons */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">

        {/* Go Back Button */}
        <button
          onClick={() => router.back()}
          className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-xl shadow-sm hover:bg-gray-300 transition-all"
        >
          Go Back to Previous Page
        </button>

        {/* Registration Page Button */}
        <Link
          href="/"
          className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl shadow-md hover:bg-purple-700 transition-all"
        >
          Go to Registration Page
        </Link>

      </div>
    </div>
  );
}
