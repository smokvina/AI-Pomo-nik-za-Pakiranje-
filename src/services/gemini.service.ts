import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type, GenerateContentResponse, Part } from '@google/genai';
import { PackingListResponse } from '../models/packing-list.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenAI;

  constructor() {
    // IMPORTANT: Users must configure their own API key.
    // This is a placeholder and will not work without a valid key.
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set!");
    }
    this.genAI = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }

  private async fileToGenerativePart(file: File): Promise<Part> {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  }

  async generatePackingList(
    tripDetails: any,
    files: File[]
  ): Promise<PackingListResponse> {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `Ti si vrhunski AI asistent za planiranje pakiranja za putovanja. Tvoja je zadaća generirati izuzetno detaljne, personalizirane i logistički optimizirane popise za pakiranje, uzimajući u obzir sve kontekstualne podatke: odredište, vremensku prognozu, sastav putnika, planirane aktivnosti, preferencije pakiranja i SVE UČITANE DATOTEKE (Slike i PDF/Itinerari). Moraš koristiti učitane slike odjeće kao primarni izvor za prijedloge. Sva objašnjenja i upute moraju biti na hrvatskom jeziku.`;
    
    const userPrompt = `Molim te, generiraj mi popis za pakiranje za moje putovanje. Koristi sve podatke navedene u nastavku, uključujući analizu priloženih datoteka (Slike ormara i PDF itinerar). Cilj je osigurati da svaki putnik ima odgovarajuću odjeću za svaku aktivnost. Detalji putovanja su: ${JSON.stringify(tripDetails, null, 2)}`;

    const fileParts = await Promise.all(files.map(file => this.fileToGenerativePart(file)));

    const contents: Part[] = [
      { text: userPrompt },
      ...fileParts
    ];
    
    // FIX: Corrected multiple syntax errors in the output schema definition (stray quotes, missing commas, using Type.STRING enum instead of "string" literal).
    // These syntax errors were causing the TypeScript compiler to fail parsing the rest of the file, leading to a cascade of errors.
    const outputSchema = {
        type: Type.OBJECT,
        properties: {
          warningsAndTips: {
            type: Type.ARRAY,
            description: "Kulturna upozorenja, specifična oprema i opći logistički savjeti temeljeni na lokaciji/prognozi.",
            items: {type: Type.STRING}
          },
          outfitSuggestions: {
            type: Type.ARRAY,
            description: "Konkretne odjevne kombinacije za ključne aktivnosti, po putniku/grupi. Preferiraj komade iz 'Ormara'.",
            items: {
              type: Type.OBJECT,
              properties: {
                activity: {type: Type.STRING},
                forPassenger: {type: Type.STRING},
                suggestion: {type: Type.STRING},
                itemsUsed: {type: Type.ARRAY, items: {type: Type.STRING}}
              },
              required: ["activity", "forPassenger", "suggestion", "itemsUsed"]
            }
          },
          packingList: {
            type: Type.OBJECT,
            properties: {
              ZaMuskarce: {
                type: Type.OBJECT, description: "Popis za muškarce.",
                 properties: {
                   Clothing: {type: Type.ARRAY, items: {type: Type.STRING}},
                   Footwear: {type: Type.ARRAY, items: {type: Type.STRING}},
                   Underwear: {type: Type.ARRAY, items: {type: Type.STRING}}
                 }
              },
              ZaZene: {
                type: Type.OBJECT, description: "Popis za žene.",
                 properties: {
                   Clothing: {type: Type.ARRAY, items: {type: Type.STRING}},
                   Footwear: {type: Type.ARRAY, items: {type: Type.STRING}},
                   Underwear: {type: Type.ARRAY, items: {type: Type.STRING}}
                 }
              },
              ZaDjecu: {
                type: Type.OBJECT, description: "Ako je broj djece > 0. Ako ne, ostaviti prazno.",
                 properties: {
                   Clothing: {type: Type.ARRAY, items: {type: Type.STRING}},
                   Footwear: {type: Type.ARRAY, items: {type: Type.STRING}},
                   Underwear: {type: Type.ARRAY, items: {type: Type.STRING}}
                 }
              },
              ZajednickeStvari: {
                type: Type.ARRAY,
                description: "Higijena, elektronika, dokumenti, oprema otporna na kišu.",
                items: {type: Type.STRING}
              }
            },
             required: ["ZaMuskarce", "ZaZene", "ZajednickeStvari"]
          },
          shoppingList: {
            type: Type.ARRAY,
            description: "Popis stvari koje PUTNIK MORA KUPITI, a koje nedostaju za potpuni popis ili optimalni outfit (temeljeno na analizi 'Ormara').",
            items: {type: Type.STRING}
          }
        },
        required: ["warningsAndTips", "outfitSuggestions", "packingList", "shoppingList"]
      };

    try {
        const response: GenerateContentResponse = await this.genAI.models.generateContent({
            model: model,
            contents: { parts: contents },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: outputSchema,
            },
        });

      const jsonString = response.text;
      return JSON.parse(jsonString) as PackingListResponse;
    } catch (error) {
      console.error('Error generating packing list:', error);
      throw new Error('Došlo je do pogreške prilikom generiranja popisa. Provjerite svoju internetsku vezu i API ključ.');
    }
  }
}
