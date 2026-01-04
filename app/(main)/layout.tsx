import Header from "@/components/common/Header";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-5xl w-full">
                <Header />
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
