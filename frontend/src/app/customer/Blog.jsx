import React from 'react';

const Blog = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
    <h1 className="text-4xl font-bold mb-4">OTW Blog</h1>
    <p className="text-lg text-gray-700 max-w-2xl mb-8 text-center">
      Tips, stories, and updates from the world of home services.
    </p>
    <div className="max-w-2xl w-full space-y-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-2">5 Ways to Keep Your Home Safe and Clean</h2>
        <p className="text-gray-600 mb-2">Discover simple tips to maintain a healthy and safe environment for your family.</p>
        <span className="text-sm text-gray-400">Posted on May 1, 2024</span>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-2">How OTW Selects Trusted Professionals</h2>
        <p className="text-gray-600 mb-2">Learn about our vetting process and why you can trust OTW for your home service needs.</p>
        <span className="text-sm text-gray-400">Posted on April 20, 2024</span>
      </div>
    </div>
  </div>
);

export default Blog;