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
          <span className="text-orange-400 font-semibold">Intute.ai</span>
        </span>
      </div>
    </footer>
  );
}

export default FooterFixed;
