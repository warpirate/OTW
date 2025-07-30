import React from 'react';

const Careers = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
    <h1 className="text-4xl font-bold mb-4">Careers at OTW</h1>
    <p className="text-lg text-gray-700 max-w-2xl mb-6 text-center">
      Join our growing team and help us revolutionize the home services industry! We’re always looking for passionate, talented individuals.
    </p>
    <h2 className="text-2xl font-semibold mb-2">Open Positions</h2>
    <ul className="text-left max-w-lg mb-6">
      <li className="mb-2"><strong>Frontend Developer</strong> – Remote/Hybrid – <span className="text-green-600">Open</span></li>
      <li className="mb-2"><strong>Customer Support Specialist</strong> – Toronto, ON – <span className="text-green-600">Open</span></li>
      <li className="mb-2"><strong>Service Provider (Plumber, Electrician, etc.)</strong> – Multiple Locations – <span className="text-green-600">Open</span></li>
    </ul>
    <p className="text-gray-600 max-w-xl text-center mb-4">
      Don’t see a role that fits? Email your resume to <a href="mailto:careers@otw.ca" className="text-blue-600 underline">careers@otw.ca</a> and we’ll get in touch!
    </p>
    <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">Apply Now</button>
  </div>
);

export default Careers;