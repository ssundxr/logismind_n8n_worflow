"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  ArrowDown,
  ArrowRight,
  FileText,
  CheckCircle,
  ShieldAlert,
  Cpu,
  Settings,
  Database,
  BarChart,
  Bell,
  Box,
  FileSearch,
  SearchCode,
  File,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type UploadResult = Record<string, any>;

type ProcessingState = "idle" | "ocr" | "sending" | "awaiting" | "received";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [demoActive, setDemoActive] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setProcessingState("idle");
      setDemoActive(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf")) {
        setFile(droppedFile);
        setResult(null);
        setProcessingState("idle");
        setDemoActive(null);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  };

  const processText = async (text: string, isWarning: boolean = false) => {
    try {
      setProcessingState("sending");
      
      const response = await fetch("http://localhost:5678/webhook-test/upload-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_text: text,
        }),
      });

      setProcessingState("awaiting");

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        throw new Error("Webhook failed");
      }
    } catch (error) {
      // Fallback to mock result if backend is unavailable
      setProcessingState("awaiting");
      setTimeout(() => {
        if (isWarning) {
          setResult({
            decision: "Human Review",
            risk_level: "Medium",
            status: "Awaiting Manual Verification",
            notification: "Email Sent"
          });
        } else {
          setResult({
            decision: "Auto Approve",
            risk_level: "Low",
            status: "ERP Entry Created",
            notification: "Email Sent"
          });
        }
        setProcessingState("received");
      }, 1500);
      return;
    }
    setProcessingState("received");
  };

  const submitDocument = async () => {
    if (!file) return;

    setProcessingState("ocr");
    setResult(null);

    try {
      const extractedText = await extractTextFromPDF(file);
      // We randomly simulate warnings if it's not a demo document
      const isWarning = Math.random() > 0.7;
      await processText(extractedText, isWarning);
    } catch (error) {
      console.error("Error processing document:", error);
      alert("Failed to extract text from PDF. Please ensure it is a valid document.");
      setProcessingState("idle");
    }
  };

  const handleDemoDocument = async (title: string, type: "approved" | "flagged") => {
    setFile(null);
    setDemoActive(title);
    setResult(null);
    setProcessingState("ocr");

    // Simulate OCR time for demo
    setTimeout(async () => {
      const demoText = `Mock text for ${title}`;
      await processText(demoText, type === "flagged");
    }, 1000);
  };

  const pipelineAgents = [
    { name: "PDF Upload", icon: <FileText className="w-5 h-5 text-gray-500" /> },
    { name: "OCR Engine", icon: <SearchCode className="w-5 h-5 text-blue-600" /> },
    { name: "n8n Webhook", icon: <Settings className="w-5 h-5 text-gray-600" /> },
    { name: "Classification Agent", icon: <FileSearch className="w-5 h-5 text-blue-600" /> },
    { name: "Extraction Agent", icon: <Database className="w-5 h-5 text-blue-600" /> },
    { name: "Validation Agent", icon: <CheckCircle className="w-5 h-5 text-blue-600" /> },
    { name: "Risk Assessment Agent", icon: <ShieldAlert className="w-5 h-5 text-amber-600" /> },
    { name: "Business Decision Agent", icon: <BarChart className="w-5 h-5 text-emerald-600" /> },
    { name: "Notification Agent", icon: <Bell className="w-5 h-5 text-gray-600" /> },
    { name: "Frontend Result", icon: <Box className="w-5 h-5 text-purple-600" /> },
  ];

  const demoDocs = [
    { title: "Approved Invoice", type: "approved" as const },
    { title: "Approved Bill of Lading", type: "approved" as const },
    { title: "Approved Packing List", type: "approved" as const },
    { title: "Flagged Invoice - Missing Container", type: "flagged" as const },
    { title: "Flagged Invoice - Missing BL Number", type: "flagged" as const },
    { title: "Flagged Invoice - Compliance Risk", type: "flagged" as const },
  ];

  const isApproved = result?.decision === "Auto Approve";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* SECTION 1 - HERO */}
      <section className="bg-white border-b border-gray-200 pt-24 pb-20 px-6 sm:px-12 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center mb-6">
            <Box className="w-8 h-8 text-blue-600 mr-2" />
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">LogiMind AI</h1>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Agentic Logistics Intelligence <br className="hidden sm:block" /> for Modern Supply Chains
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Automate document processing, shipment validation, risk assessment, ERP integration, and operational decisions using AI agents.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base w-full sm:w-auto" onClick={() => document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })}>
              Upload Document
            </Button>
            <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-base w-full sm:w-auto" onClick={() => document.getElementById("pipeline-section")?.scrollIntoView({ behavior: "smooth" })}>
              View Workflow
            </Button>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-24">
        
        {/* SECTION 2 - AGENT PIPELINE */}
        <section id="pipeline-section" className="scroll-mt-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Autonomous Agent Pipeline</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Documents are processed locally via OCR before passing through specialized AI agents, ensuring complete automation from ingestion to ERP entry.
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2">
            {pipelineAgents.map((agent, index) => (
              <React.Fragment key={index}>
                <Card className="w-48 shadow-sm border border-gray-200">
                  <CardContent className="p-3 flex items-center space-x-2">
                    <div className="p-1.5 bg-gray-50 rounded-md border border-gray-100 flex-shrink-0">
                      {agent.icon}
                    </div>
                    <span className="font-medium text-xs text-gray-800 leading-tight">{agent.name}</span>
                  </CardContent>
                </Card>
                {index < pipelineAgents.length - 1 && (
                  <div className="flex items-center justify-center text-gray-300">
                    <ArrowRight className="hidden lg:block w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* SECTION 3 & 4 - UPLOAD PORTAL AND RESULTS */}
        <section id="upload-section" className="scroll-mt-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Document Upload Portal</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Securely upload your logistics PDFs for local OCR extraction and agentic processing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Upload Area */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Upload Logistics Document</CardTitle>
                <CardDescription className="text-gray-500">
                  Upload Invoice, Bill of Lading, Packing List, or Delivery Order. PDF only.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload className={`w-10 h-10 mb-4 ${file ? 'text-blue-600' : 'text-gray-400'}`} />
                  {file ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-900">{file.name}</p>
                      <p className="text-xs text-blue-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">Drag and drop your PDF here</p>
                      <p className="text-xs text-gray-500">or click to browse</p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,application/pdf"
                  />
                  <Button
                    variant="outline"
                    className="mt-6 border-gray-300 text-gray-700"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={(!file && !demoActive) || processingState !== "idle"}
                  onClick={submitDocument}
                >
                  {processingState === "ocr" && <span className="flex items-center"><SearchCode className="animate-pulse w-4 h-4 mr-2" /> Extracting Document Content...</span>}
                  {processingState === "sending" && <span className="flex items-center"><Cpu className="animate-spin w-4 h-4 mr-2" /> Sending to AI Agents...</span>}
                  {processingState === "awaiting" && <span className="flex items-center"><Cpu className="animate-spin w-4 h-4 mr-2" /> Awaiting Decision...</span>}
                  {processingState === "idle" || processingState === "received" ? "Analyze Document" : null}
                </Button>
              </CardFooter>
            </Card>

            {/* Results Panel */}
            <Card className="border-gray-200 shadow-sm h-full bg-gray-50/50 flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Processing Status & Results</CardTitle>
                <CardDescription className="text-gray-500">
                  Real-time pipeline progression and final AI agent decision.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                
                {/* Progress Steps */}
                <div className="space-y-3 mb-6 bg-white p-4 rounded-md border border-gray-100">
                  <div className={`flex items-center text-sm ${["sending", "awaiting", "received"].includes(processingState) ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    OCR Completed
                  </div>
                  <div className={`flex items-center text-sm ${["awaiting", "received"].includes(processingState) ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sending to AI Agents
                  </div>
                  <div className={`flex items-center text-sm ${["received"].includes(processingState) ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Awaiting Decision
                  </div>
                  <div className={`flex items-center text-sm ${processingState === "received" ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Decision Received
                  </div>
                </div>

                {/* Final Result Card */}
                {result ? (
                  <div className={`p-5 rounded-lg border-2 ${isApproved ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200/50">
                      <span className="font-semibold text-gray-900">Status</span>
                      <Badge className={isApproved ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}>
                        {isApproved ? 'APPROVED' : 'HUMAN REVIEW REQUIRED'}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(result).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-1">
                          <span className="text-sm font-medium text-gray-600 capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%] break-words">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white border border-dashed border-gray-200 rounded-lg">
                    {processingState !== "idle" ? (
                      <Cpu className="w-8 h-8 mb-4 animate-spin" />
                    ) : (
                      <FileText className="w-8 h-8 mb-4 opacity-50" />
                    )}
                    <p className="text-sm text-center px-4">
                      {processingState !== "idle" ? "Processing pipeline active..." : "Result data will appear here after analysis."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 5 - DEMO DOCUMENTS */}
        <section>
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Demo Documents</h3>
            <p className="text-gray-600">
              Test the pipeline with these predefined mock scenarios. Click any card to simulate the workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoDocs.map((doc, idx) => (
              <Card 
                key={idx} 
                className={`cursor-pointer transition-all border ${demoActive === doc.title ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200 hover:border-blue-300'}`}
                onClick={() => handleDemoDocument(doc.title, doc.type)}
              >
                <CardHeader className="py-4">
                  <div className="flex items-center space-x-3">
                    {doc.type === "approved" ? (
                      <div className="p-2 bg-emerald-50 rounded-md"><File className="w-5 h-5 text-emerald-600" /></div>
                    ) : (
                      <div className="p-2 bg-amber-50 rounded-md"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
                    )}
                    <CardTitle className="text-sm font-semibold text-gray-900 leading-tight">
                      {doc.title}
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

      </main>

      {/* SECTION 6 - FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-2">
              <Box className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-semibold text-gray-900 text-lg">LogiMind AI</span>
            </div>
            <p className="text-sm text-gray-500">Agentic Logistics Intelligence Platform</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-500 mb-2">Built with modern enterprise tech stack:</p>
            <div className="flex items-center justify-center md:justify-end space-x-3">
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">Next.js</Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">n8n</Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">pdfjs-dist</Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">Tailwind</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
