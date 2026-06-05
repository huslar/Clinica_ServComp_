import React from "react";

export function Icon({ name, size = 18 }) {
  const paths = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    filter: <><path d="M4 4h16l-6 7v5l-4 3v-8Z" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5M14 11v5" /></>,
    close: <><path d="M18 6 6 18M6 6l12 12" /></>,
    arrowLeft: <><path d="m15 18-6-6 6-6" /></>,
    arrowRight: <><path d="m9 18 6-6-6-6" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    more: <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    chevronDown: <><path d="m6 9 6 6 6-6" /></>,
    graduation: <><path d="m2 10 10-5 10 5-10 5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5M22 10v6" /></>,
    fingerprint: <><path d="M12 11a2 2 0 0 1 2 2c0 3-.6 5.2-1.6 7M8 13a4 4 0 0 1 8 0c0 3.5-.7 6-1.8 8M5 13a7 7 0 0 1 14 0c0 2.2-.2 4.2-.7 6M3 13a9 9 0 0 1 18 0M10 16c-.2 1.8-.7 3.4-1.5 5M7 17c-.2 1-.5 2-.9 3" /></>,
    tooth: <><path d="M12 3c-2.2 0-3.1-1-5-1C4.2 2 2.5 4.5 3 8c.7 4.5 2.8 5.2 3.3 10 .2 2 .8 4 2.2 4 1.8 0 1.4-6 3.5-6s1.7 6 3.5 6c1.4 0 2-2 2.2-4 .5-4.8 2.6-5.5 3.3-10 .5-3.5-1.2-6-4-6-1.9 0-2.8 1-5 1Z" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
