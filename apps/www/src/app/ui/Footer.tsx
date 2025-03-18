export default function Footer() {
  return (
    <footer className="bg-main fixed inset-x-0 bottom-0 w-full px-6 py-4 text-white">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold">Strapex</div>
        <div className="flex flex-row items-center">
          <div className="mr-4">© 2024 Strapex</div>
          <div className="mr-4">Terms of Service</div>
          <div>Privacy Policy</div>
        </div>
      </div>
    </footer>
  );
}
