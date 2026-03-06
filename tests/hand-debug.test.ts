import { describe, test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { parseLbrn2 } from "../src/lbrn2Parser";
import { lbrn2ToSvg } from "../src/svgConverter";
import { XMLParser } from "fast-xml-parser";

// This test is designed to debug a specific file by analyzing the data flow.
describe("Manual Hand Debug Test", () => {
  test("should identify which shapes are being dropped", () => {
    const lbrn2Path = path.join(import.meta.dir, "../example/Base para modelar uñas.lbrn2");
    const lbrn2Content = fs.readFileSync(lbrn2Path, "utf-8");

    // --- Step 1: Manually parse the XML and get all shape IDs ---
    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const rawParsed = xmlParser.parse(lbrn2Content);
    
    const allShapeVertIDs = new Set<string>();
    const definingVertIDs = new Set<string>();

    function findAndLogShapeIDs(shapes: any[]) {
      if (!shapes || !Array.isArray(shapes)) return;
      for (const shape of shapes) {
        if (shape.VertID !== undefined) {
          allShapeVertIDs.add(String(shape.VertID));
        }
        if (shape.VertList) {
          definingVertIDs.add(String(shape.VertID));
        }

        // Check for backup paths in text
        if (shape.Type === "Text" && shape.BackupPath?.Shape) {
          const backupShape = shape.BackupPath.Shape;
          if (backupShape.VertID !== undefined) {
            allShapeVertIDs.add(`T_${String(backupShape.VertID)}`); // Prefix to denote it's from a text backup
          }
          if (backupShape.VertList) {
            definingVertIDs.add(`T_${String(backupShape.VertID)}`);
          }
        }

        // Recurse into groups
        if (shape.Type === "Group" && shape.Children) {
          let childrenArr: any[] = [];
          if (Array.isArray(shape.Children)) {
            childrenArr = shape.Children;
          } else if (shape.Children.Shape) {
            childrenArr = Array.isArray(shape.Children.Shape) ? shape.Children.Shape : [shape.Children.Shape];
          } else if (typeof shape.Children === 'object' && shape.Children !== null) {
            childrenArr = [shape.Children];
          }
          findAndLogShapeIDs(childrenArr);
        }
      }
    }
    
    let initialShapes = rawParsed.LightBurnProject.Shape;
    if(!Array.isArray(initialShapes)) initialShapes = [initialShapes];
    findAndLogShapeIDs(initialShapes);

    console.log("--- Initial Data Analysis ---");
    console.log(`Found ${allShapeVertIDs.size} unique VertIDs in total.`);
    console.log(`Found ${definingVertIDs.size} shapes that DEFINE geometry (have VertList).`);
    console.log("All VertIDs found:", Array.from(allShapeVertIDs).sort((a,b) => Number(a.replace('T_','')) - Number(b.replace('T_',''))).join(', '));
    

    // --- Step 2: Run the actual library parser ---
    const parsedLbrn2 = parseLbrn2(lbrn2Content);
    
    // --- Step 3: Get all shape IDs from the final, processed object ---
    const finalShapeVertIDs = new Set<string>();
    function findFinalShapeIDs(shapes: any[]) {
      if (!shapes || !Array.isArray(shapes)) return;
      for (const shape of shapes) {
        if (shape.VertID !== undefined) {
          finalShapeVertIDs.add(String(shape.VertID));
        }
        if (shape.Type === "Group" && shape.Children) {
          findFinalShapeIDs(shape.Children);
        }
      }
    }

    if(parsedLbrn2.LightBurnProject.Shape){
        findFinalShapeIDs(parsedLbrn2.LightBurnProject.Shape);
    }
    
    console.log("\n--- Final Parsed Object Analysis ---");
    console.log(`Found ${finalShapeVertIDs.size} unique VertIDs in the final object.`);
    console.log("Final VertIDs found:", Array.from(finalShapeVertIDs).sort((a,b) => Number(a)-Number(b)).join(', '));

    // --- Step 4: Find the missing IDs ---
    const missingIDs = new Set(allShapeVertIDs);
    finalShapeVertIDs.forEach(id => missingIDs.delete(id));
    
    console.log(`\n--- Conclusion ---`);
    console.log(`Total shapes dropped: ${allShapeVertIDs.size - finalShapeVertIDs.size}`);
    console.log("Missing VertIDs:", Array.from(missingIDs).sort((a,b) => Number(a.replace('T_','')) - Number(b.replace('T_',''))).join(', '));

    const outputSvgPath = path.join(import.meta.dir, "../example/Base para modelar uñas.svg");
    const generatedSvg = lbrn2ToSvg(parsedLbrn2);
    fs.writeFileSync(outputSvgPath, generatedSvg);
    console.log(`\nGenerated SVG written to: ${outputSvgPath}`);

    expect(missingIDs.size).toBe(0);
  });
});
