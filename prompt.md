**Task: Implement Full Mobile Responsiveness for Admin & Client Dashboards**

**Context:** I have separated the User and Admin sites into two different repositories. The desktop UI is complete (based on a 260px sidebar layout). I now need to make both sites fully responsive and mobile-friendly using Tailwind CSS and MUI v5.

**Requirements (Strictly follow `CLAUDE.md`):**

1. **Navigation & Layout (Mobile):**
   - **Sidebar to Drawer:** On screens smaller than `lg` (1024px), the fixed sidebar must hide. Replace it with a "Hamburger" menu icon in a top sticky header.
   - **MUI Drawer:** Use the MUI `Drawer` component for the mobile menu. It should slide in from the left and contain the same navigation items as the desktop sidebar.
   - **Header:** Create a mobile header that displays the app logo (`appaihelp`) and the user profile/avatar.

2. **Package Cards & Grid (Mobile):**
   - **Responsive Grid:** Update the Package Management grid from `grid-cols-3` to `grid-cols-1` on mobile and `grid-cols-2` on tablets.
   - **Card Adjustments:** Reduce padding and font sizes on mobile to ensure content (features list, price) fits without excessive scrolling.

3. **Data Tables (Mobile):**
   - For pages using MUI DataGrid/Tables, ensure horizontal scrolling is enabled or switch to a "Card-list" view for mobile users to prevent UI breaking.

4. **UI/UX Touch Optimizations:**
   - **Interactive Elements:** Ensure all buttons, switches (Active/Inactive), and inputs have a minimum touch target of 44x44px.
   - **Spacing:** Use Tailwind's responsive prefixes (e.g., `p-4 md:p-8`) to adjust margins and paddings for smaller screens.

5. **Theme Consistency:**
   - Dark Mode toggle must be easily accessible in the mobile Drawer.
   - Maintain the Electric Blue (`#3B82F6`) theme for all primary mobile actions.

6. **Technical Implementation:**
   - Use React hooks (`useMediaQuery` from MUI or custom Tailwind hooks) to detect screen size changes.
   - Ensure `AdminGuard` and `ProtectedRoute` logic remains unaffected by layout changes.

**Deliverables:**

- Updated `MainLayout.tsx` (for User) and `AdminLayout.tsx` (for Admin).
- A reusable `MobileHeader` component.
- Responsive CSS/Tailwind adjustments for `PackageCard.tsx`.
