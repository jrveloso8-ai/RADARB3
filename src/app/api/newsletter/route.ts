import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Subscriber {
  email: string;
  subscribedAt: string;
  source: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');

function getSubscribers(): Subscriber[] {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // Ignora erro em ambientes serverless read-only
    }
  }

  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      const content = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Retorna lista vazia
  }

  return [];
}

function saveSubscribers(subscribers: Subscriber[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2), 'utf-8');
  } catch {
    // Em produção serverless sem disco gravável, mantém no ciclo de execução
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email?.trim().toLowerCase();

    // Validação estrita de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Por favor, informe um endereço de e-mail válido.' },
        { status: 400 }
      );
    }

    const subscribers = getSubscribers();
    const existing = subscribers.find((s) => s.email === email);

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: 'Você já está cadastrado para receber o Resumo da Abertura do Mercado!',
        isExisting: true,
      });
    }

    const newSub: Subscriber = {
      email,
      subscribedAt: new Date().toISOString(),
      source: 'radar-b3-web',
    };

    subscribers.push(newSub);
    saveSubscribers(subscribers);

    return NextResponse.json({
      ok: true,
      message: 'Cadastro realizado com sucesso! Você receberá diariamente o Resumo da Abertura do Mercado antes do pregão.',
      totalSubscribers: subscribers.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao processar o cadastro de e-mail. Tente novamente.' },
      { status: 500 }
    );
  }
}
