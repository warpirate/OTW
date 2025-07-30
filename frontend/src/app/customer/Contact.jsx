import React from 'react';

const Contact = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
    <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
    <p className="text-lg text-gray-700 max-w-2xl mb-6 text-center">
      Have a question or need help? Reach out to us!
    </p>
    <form className="bg-white shadow rounded-lg p-6 w-full max-w-md mb-6">
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Name</label>
        <input className="w-full border border-gray-300 rounded px-3 py-2" type="text" placeholder="Your Name" />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Email</label>
        <input className="w-full border border-gray-300 rounded px-3 py-2" type="email" placeholder="you@email.com" />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Message</label>
        <textarea className="w-full border border-gray-300 rounded px-3 py-2" rows="4" placeholder="How can we help?" />
      </div>
      <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700" type="button">Send Message</button>
    </form>
    <div className="text-center text-gray-600">
      <p>123 Street, Toronto, ON, Canada</p>
      <p>Email: <a href="mailto:contact@otw.ca" className="text-blue-600 underline">contact@otw.ca</a></p>
      <p>Phone: <a href="tel:+1234567890" className="text-blue-600 underline">+1 234-567-8900</a></p>
    </div>
  </div>
);

export default Contact;