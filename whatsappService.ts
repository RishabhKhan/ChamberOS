import React from 'react';
import { Invoice } from '../types';

interface InvoiceTemplateProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoiceTemplate({ invoice, onClose }: InvoiceTemplateProps) {
  const amountInWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
      return '';
    };

    return inWords(num).trim() + ' Only';
  };

  const clerkage = invoice.amount * 0.1;
  const total = (invoice.amount || 0) + clerkage;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-[800px] shadow-2xl rounded-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-bold text-slate-800">Invoice Preview</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-legal-navy text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all"
            >
              Print / Save PDF
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-300 transition-all"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-12 bg-white text-black font-serif print:p-0" id="printable-invoice">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-3xl font-bold italic mb-1">Rishabh Ahmad Khan</h1>
              <p className="text-xl italic">Advocate</p>
              <p className="text-xl italic">High Court at Calcutta</p>
            </div>
            <div className="text-right text-sm italic space-y-1">
              <p className="underline font-bold">Office:</p>
              <p>Room No.63, Ground Floor,</p>
              <p>6, Old Post Office Street,</p>
              <p>Kolkata – 700 001.</p>
              <p>Contact Number: (+91) 9123396708</p>
              <p>Email ID: rishabhahmedkhan@gmail.com</p>
            </div>
          </div>

          {/* Recipient & Date */}
          <div className="flex justify-between items-end mb-8">
            <div className="space-y-1">
              <p className="text-lg">To,</p>
              <p className="text-lg font-bold">{invoice.clientName},</p>
              <p className="text-lg italic">Madam/Sir,</p>
            </div>
            <div className="text-lg">
              <p>Date: {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB') : '—'}</p>
            </div>
          </div>

          <p className="text-center text-lg italic mb-8 underline underline-offset-4">
            Please find enclosed the memorandum of fees.
          </p>

          {/* Table */}
          <table className="w-full border-collapse border border-black mb-8">
            <thead>
              <tr>
                <th className="border border-black p-2 text-left w-12 italic">Sl.</th>
                <th className="border border-black p-2 text-center italic">Particulars</th>
                <th className="border border-black p-2 text-center w-32 italic">Amount<br/><span className="text-xs">(In Rupees)</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-4 align-top">1.</td>
                <td className="border border-black p-4 min-h-[100px]">
                  Professional services rendered for legal consultation and representation.
                </td>
                <td className="border border-black p-4 text-right align-top font-mono">
                  {invoice.amount.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4 text-right italic font-bold">10% Clerkage</td>
                <td className="border border-black p-4 text-right font-mono">{clerkage.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4 text-right font-bold uppercase tracking-widest">TOTAL</td>
                <td className="border border-black p-4 text-right font-bold font-mono">{total.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border border-black p-4 italic font-bold">
                  In words (Rupees {amountInWords(total)})
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer / Bank Details */}
          <div className="text-sm italic space-y-1">
            <p className="underline">Disbursal to Bank Transfer/NEFT/RTGS/Cheques:</p>
            <p>Rishabh Ahmad Khan</p>
            <p>Account No.55550101997508</p>
            <p>Federal Bank</p>
            <p>IFSC: FDRL0005555</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}
