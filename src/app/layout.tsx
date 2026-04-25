import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'CareerMVP 职向标 - 求职信心构建引擎',
  description: '通过 JD 解构、经历翻译、微行动冲刺、实战验证，将求职焦虑转化为可量化的能力证据',
  keywords: ['求职', '面试', '简历', 'JD解析', '模拟面试', '职业规划'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 dark:border-gray-800 py-6">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>CareerMVP 职向标 · 让求职每一步都有证据</p>
            <p className="mt-1 text-xs">
              ⚠️ AI 生成内容仅供参考，请结合实际情况调整，严禁虚构经历
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
