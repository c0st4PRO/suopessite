import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Shield, FileText, Truck, HelpCircle } from "lucide-react";

export function LegalPages() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-suopes-black pt-24 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-24"
        >
          {/* Termos de Serviço */}
          <section id="termos" className="scroll-mt-24">
            <div className="flex items-center gap-4 mb-8">
              <FileText className="text-suopes-gold" size={32} />
              <h1 className="text-4xl font-black uppercase tracking-tighter">Termos de Serviço</h1>
            </div>
            <div className="prose prose-invert max-w-none font-mono text-xs text-suopes-muted leading-relaxed space-y-6 uppercase">
              <p>1. ACEITAÇÃO DOS TERMOS<br />AO ACESSAR O SISTEMA SUOPES TACTICAL, VOCÊ CONCORDA EM CUMPRIR ESTES TERMOS DE SERVIÇO, TODAS AS LEIS E REGULAMENTOS APLICÁVEIS.</p>
              <p>2. USO DE LICENÇA<br />É CONCEDIDA PERMISSÃO PARA BAIXAR TEMPORARIAMENTE UMA CÓPIA DOS MATERIAIS NO SITE APENAS PARA VISUALIZAÇÃO PASSAGEIRA PESSOAL E NÃO COMERCIAL.</p>
              <p>3. ISENÇÃO DE RESPONSABILIDADE<br />OS MATERIAIS NO SITE DA SUOPES SÃO FORNECIDOS 'COMO ESTÃO'. NÃO OFERECEMOS GARANTIAS, EXPRESSAS OU IMPLÍCITAS, E POR ESTE MEIO, ISENTAMOS E NEGAMOS TODAS AS OUTRAS GARANTIAS.</p>
              <p>4. LIMITAÇÕES<br />EM NENHUM CASO A SUOPES OU SEUS FORNECEDORES SERÃO RESPONSÁVEIS POR QUAISQUER DANOS DECORRENTES DO USO OU DA INCAPACIDADE DE USAR OS MATERIAIS.</p>
            </div>
          </section>

          {/* Política de Privacidade */}
          <section id="privacidade" className="scroll-mt-24">
            <div className="flex items-center gap-4 mb-8">
              <Shield className="text-suopes-gold" size={32} />
              <h1 className="text-4xl font-black uppercase tracking-tighter">Política de Privacidade</h1>
            </div>
            <div className="prose prose-invert max-w-none font-mono text-xs text-suopes-muted leading-relaxed space-y-6 uppercase">
              <p>A SUA PRIVACIDADE É IMPORTANTE PARA NÓS. É POLÍTICA DA SUOPES RESPEITAR A SUA PRIVACIDADE EM RELAÇÃO A QUALQUER INFORMAÇÃO SUA QUE POSSAMOS COLETAR NO SITE.</p>
              <p>SOLICITAMOS INFORMAÇÕES PESSOAIS APENAS QUANDO REALMENTE PRECISAMOS DELAS PARA LHE FORNECER UM SERVIÇO. FAZEMO-LO POR MEIOS JUSTOS E LEGAIS, COM O SEU CONHECIMENTO E CONSENTIMENTO.</p>
              <p>RETEMOS AS INFORMAÇÕES COLETADAS APENAS PELO TEMPO NECESSÁRIO PARA FORNECER O SERVIÇO SOLICITADO. QUANDO ARMAZENAMOS DADOS, PROTEGEMO-LOS DENTRO DE MEIOS COMERCIALMENTE ACEITÁVEIS PARA EVITAR PERDAS E ROUBOS.</p>
            </div>
          </section>

          {/* Envio e Devoluções */}
          <section id="envio" className="scroll-mt-24">
            <div className="flex items-center gap-4 mb-8">
              <Truck className="text-suopes-gold" size={32} />
              <h1 className="text-4xl font-black uppercase tracking-tighter">Envio e Devoluções</h1>
            </div>
            <div className="prose prose-invert max-w-none font-mono text-xs text-suopes-muted leading-relaxed space-y-6 uppercase">
              <p>ENVIO:<br />TODOS OS PEDIDOS SÃO PROCESSADOS EM ATÉ 48 HORAS ÚTEIS APÓS A CONFIRMAÇÃO DO PAGAMENTO. O PRAZO DE ENTREGA VARIA DE ACORDO COM A REGIÃO E O MÉTODO DE ENVIO SELECIONADO.</p>
              <p>DEVOLUÇÕES:<br />VOCÊ TEM O DIREITO DE DEVOLVER QUALQUER ITEM EM ATÉ 7 DIAS APÓS O RECEBIMENTO, DESDE QUE O PRODUTO ESTEJA EM SUA EMBALAGEM ORIGINAL E SEM SINAIS DE USO.</p>
              <p>TROCAS:<br />PARA TROCAS POR TAMANHO OU DEFEITO, ENTRE EM CONTATO COM NOSSO SUPORTE TÁTICO EM ATÉ 30 DIAS APÓS A COMPRA.</p>
            </div>
          </section>

          {/* Atendimento */}
          <section id="atendimento" className="scroll-mt-24">
            <div className="flex items-center gap-4 mb-8">
              <HelpCircle className="text-suopes-gold" size={32} />
              <h1 className="text-4xl font-black uppercase tracking-tighter">Atendimento</h1>
            </div>
            <div className="bg-suopes-gray/10 border border-suopes-gray p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-suopes-gold font-mono text-[10px] uppercase tracking-widest mb-2">Suporte por E-mail</h3>
                  <p className="text-sm font-bold">SUPORTE@SUOPES.COM.BR</p>
                  <p className="text-[10px] text-suopes-muted font-mono uppercase mt-1">RESPOSTA EM ATÉ 24H</p>
                </div>
                <div>
                  <h3 className="text-suopes-gold font-mono text-[10px] uppercase tracking-widest mb-2">Horário de Operação</h3>
                  <p className="text-sm font-bold">SEG - SEX: 09:00 ÀS 18:00</p>
                  <p className="text-[10px] text-suopes-muted font-mono uppercase mt-1">FUSO HORÁRIO: BRT (BRASÍLIA)</p>
                </div>
              </div>
              <div className="pt-8 border-t border-suopes-gray">
                <h3 className="text-suopes-gold font-mono text-[10px] uppercase tracking-widest mb-4">Envie uma Mensagem</h3>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="NOME COMPLETO" className="bg-suopes-black border border-suopes-gray p-4 text-[10px] font-mono outline-none focus:border-suopes-gold transition-colors" />
                    <input type="email" placeholder="E-MAIL OPERACIONAL" className="bg-suopes-black border border-suopes-gray p-4 text-[10px] font-mono outline-none focus:border-suopes-gold transition-colors" />
                  </div>
                  <textarea rows={4} placeholder="RELATÓRIO DA MISSÃO / DÚVIDA" className="w-full bg-suopes-black border border-suopes-gray p-4 text-[10px] font-mono outline-none focus:border-suopes-gold transition-colors resize-none"></textarea>
                  <button type="button" className="btn-suopes w-full h-12">ENVIAR MENSAGEM</button>
                </form>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
