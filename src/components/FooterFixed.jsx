import React from "react";
import intuteLogo from "../assets/Intute.png";

function FooterFixed() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-black border-t border-orange-500/30 text-gray-300 text-sm py-6 mt-auto">
      <div className="container mx-auto flex justify-center items-center space-x-3">
        <img
          src={intuteLogo}
          alt="Intute.ai Logo"
          className="h-10 w-auto opacity-95"
        />
        <span className="text-base">
          Secured by{" "}
          <a
            href="https://www.intute.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 font-semibold hover:text-orange-300 transition-colors duration-200 underline underline-offset-2"
          >
            Intute.ai
          </a>
        </span>
      </div>
    </footer>
  );
}

export default FooterFixed;