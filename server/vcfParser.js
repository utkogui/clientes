const fs = require('fs');

class VCFParser {
  static parseVCF(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const vcards = this.parseVCFContent(content);
      return vcards;
    } catch (error) {
      console.error('Erro ao ler arquivo VCF:', error);
      return [];
    }
  }

  static parseVCFContent(content) {
    const vcards = [];
    const vcardBlocks = content.split('BEGIN:VCARD');
    
    for (let i = 1; i < vcardBlocks.length; i++) {
      const block = vcardBlocks[i];
      const vcard = this.parseVCardBlock(block);
      if (vcard && (vcard.nome || vcard.email)) {
        vcards.push(vcard);
      }
    }
    
    return vcards;
  }

  static parseVCardBlock(block) {
    const lines = block.split('\n');
    const vcard = {
      nome: '',
      email: '',
      telefone: '',
      empresa: ''
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('FN:')) {
        vcard.nome = this.decodeQuotedPrintable(trimmedLine.substring(3));
      } else if (trimmedLine.startsWith('N:')) {
        const nameParts = trimmedLine.substring(2).split(';');
        if (nameParts.length > 0 && nameParts[0]) {
          vcard.nome = this.decodeQuotedPrintable(nameParts[0]);
        }
      } else if (trimmedLine.startsWith('EMAIL')) {
        const emailMatch = trimmedLine.match(/EMAIL[^:]*:(.+)/);
        if (emailMatch) {
          vcard.email = emailMatch[1];
          // Tentar extrair empresa do domínio do email
          const domain = emailMatch[1].split('@')[1];
          if (domain && !domain.includes('gmail.com') && !domain.includes('hotmail.com') && 
              !domain.includes('yahoo.com') && !domain.includes('outlook.com')) {
            vcard.empresa = domain.split('.')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim();
          }
        }
      } else if (trimmedLine.startsWith('TEL')) {
        const telMatch = trimmedLine.match(/TEL[^:]*:(.+)/);
        if (telMatch) {
          let telefone = telMatch[1].replace(/\D/g, ''); // Remove caracteres não numéricos
          // Se não tem telefone ainda ou este é mais completo, usar este
          if (!vcard.telefone || telefone.length > vcard.telefone.length) {
            vcard.telefone = telefone;
          }
        }
      } else if (trimmedLine.startsWith('ORG:')) {
        vcard.empresa = this.decodeQuotedPrintable(trimmedLine.substring(4));
      } else if (trimmedLine.startsWith('TITLE:')) {
        // Se não tem empresa, usar o título como referência
        if (!vcard.empresa) {
          vcard.empresa = this.decodeQuotedPrintable(trimmedLine.substring(6));
        }
      }
    }

    return vcard;
  }

  static decodeQuotedPrintable(str) {
    if (!str) return '';
    
    // Decodifica caracteres quoted-printable
    return str.replace(/=([0-9A-F]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  }

  static extractPhoneNumbers(content) {
    const phoneRegex = /TEL[^:]*:([^\r\n]+)/g;
    const phones = [];
    let match;
    
    while ((match = phoneRegex.exec(content)) !== null) {
      const phone = match[1].replace(/\D/g, '');
      if (phone.length >= 10) {
        phones.push(phone);
      }
    }
    
    return [...new Set(phones)]; // Remove duplicatas
  }
}

module.exports = VCFParser;
