import type { Player, Roster } from '../types'
import { TEAMS } from './teams'

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLAS (titulares y suplentes)
//
// Convocatorias REALES basadas en las nóminas recientes (2024–2025) de cada
// selección. Los 11 primeros se toman como titulares y el resto como suplentes.
// Los dorsales son indicativos (orden de la lista), no necesariamente oficiales.
//
// Totalmente EDITABLE: corregí nombres, posiciones o dorsales acá. Las selecciones
// menos cubiertas pueden necesitar ajustes cuando salgan las listas oficiales.
// ─────────────────────────────────────────────────────────────────────────────

type Pos = NonNullable<Player['position']>
type Entry = [string, Pos]

// 11 titulares (orden POR, DEF, MED, DEL) + suplentes.
const SQUADS: Record<string, Entry[]> = {
  // ── Grupo A ──
  MEX: [
    ['Guillermo Ochoa', 'POR'], ['Jorge Sánchez', 'DEF'], ['César Montes', 'DEF'], ['Johan Vásquez', 'DEF'], ['Jesús Gallardo', 'DEF'],
    ['Edson Álvarez', 'MED'], ['Luis Romo', 'MED'], ['Orbelín Pineda', 'MED'],
    ['Hirving Lozano', 'DEL'], ['Santiago Giménez', 'DEL'], ['Alexis Vega', 'DEL'],
    ['Carlos Acevedo', 'POR'], ['Julián Araujo', 'DEF'], ['Israel Reyes', 'DEF'], ['Erick Sánchez', 'MED'], ['Roberto Alvarado', 'DEL'], ['Uriel Antuna', 'DEL'], ['Raúl Jiménez', 'DEL'],
  ],
  RSA: [
    ['Ronwen Williams', 'POR'], ['Nyiko Mobbie', 'DEF'], ['Siyanda Xulu', 'DEF'], ['Mothobi Mvala', 'DEF'], ['Aubrey Modiba', 'DEF'],
    ['Teboho Mokoena', 'MED'], ['Sphephelo Sithole', 'MED'], ['Themba Zwane', 'MED'],
    ['Percy Tau', 'DEL'], ['Lyle Foster', 'DEL'], ['Evidence Makgopa', 'DEL'],
    ['Ricardo Goss', 'POR'], ['Khuliso Mudau', 'DEF'], ['Grant Kekana', 'DEF'], ['Thapelo Maseko', 'MED'], ['Bongokuhle Hlongwane', 'DEL'], ['Zakhele Lepasa', 'DEL'], ['Mihlali Mayambela', 'DEL'],
  ],
  COR: [
    ['Kim Seung-gyu', 'POR'], ['Kim Young-gwon', 'DEF'], ['Kim Min-jae', 'DEF'], ['Kim Tae-hwan', 'DEF'], ['Kim Jin-su', 'DEF'],
    ['Hwang In-beom', 'MED'], ['Lee Jae-sung', 'MED'], ['Park Yong-woo', 'MED'],
    ['Son Heung-min', 'DEL'], ['Hwang Hee-chan', 'DEL'], ['Lee Kang-in', 'DEL'],
    ['Jo Hyeon-woo', 'POR'], ['Seol Young-woo', 'DEF'], ['Hong Hyun-seok', 'MED'], ['Jeong Woo-yeong', 'MED'], ['Oh Hyeon-gyu', 'DEL'], ['Cho Gue-sung', 'DEL'], ['Na Sang-ho', 'DEL'],
  ],
  CZE: [
    ['Jindřich Staněk', 'POR'], ['Vladimír Coufal', 'DEF'], ['Tomáš Holeš', 'DEF'], ['Robin Hranáč', 'DEF'], ['David Doudera', 'DEF'],
    ['Tomáš Souček', 'MED'], ['Lukáš Provod', 'MED'], ['Antonín Barák', 'MED'], ['Pavel Šulc', 'MED'],
    ['Patrik Schick', 'DEL'], ['Adam Hložek', 'DEL'],
    ['Tomáš Vaclík', 'POR'], ['David Jurásek', 'DEF'], ['Ladislav Krejčí', 'DEF'], ['Lukáš Červ', 'MED'], ['Václav Černý', 'DEL'], ['Mojmír Chytil', 'DEL'], ['Matěj Vydra', 'DEL'],
  ],

  // ── Grupo B ──
  CAN: [
    ['Maxime Crépeau', 'POR'], ['Alistair Johnston', 'DEF'], ['Moïse Bombito', 'DEF'], ['Derek Cornelius', 'DEF'], ['Alphonso Davies', 'DEF'],
    ['Stephen Eustáquio', 'MED'], ['Ismaël Koné', 'MED'], ['Jonathan Osorio', 'MED'],
    ['Tajon Buchanan', 'DEL'], ['Jonathan David', 'DEL'], ['Cyle Larin', 'DEL'],
    ['Dayne St. Clair', 'POR'], ['Richie Laryea', 'DEF'], ['Steven Vitória', 'DEF'], ['Ali Ahmed', 'MED'], ['Liam Millar', 'DEL'], ['Jacob Shaffelburg', 'DEL'], ['Promise David', 'DEL'],
  ],
  QAT: [
    ['Meshaal Barsham', 'POR'], ['Pedro Miguel', 'DEF'], ['Boualem Khoukhi', 'DEF'], ['Tarek Salman', 'DEF'], ['Homam Ahmed', 'DEF'],
    ['Karim Boudiaf', 'MED'], ['Hassan Al-Haydos', 'MED'], ['Abdulaziz Hatem', 'MED'],
    ['Akram Afif', 'DEL'], ['Almoez Ali', 'DEL'], ['Ismail Mohamad', 'DEL'],
    ['Saad Al Sheeb', 'POR'], ['Ahmed Fadel', 'DEF'], ['Assim Madibo', 'MED'], ['Mostafa Meshaal', 'MED'], ['Mohammed Muntari', 'DEL'], ['Yusuf Abdurisag', 'DEL'], ['Ahmed Alaaeldin', 'DEL'],
  ],
  SUI: [
    ['Yann Sommer', 'POR'], ['Manuel Akanji', 'DEF'], ['Nico Elvedi', 'DEF'], ['Ricardo Rodríguez', 'DEF'], ['Silvan Widmer', 'DEF'],
    ['Granit Xhaka', 'MED'], ['Remo Freuler', 'MED'], ['Michel Aebischer', 'MED'], ['Xherdan Shaqiri', 'MED'],
    ['Breel Embolo', 'DEL'], ['Zeki Amdouni', 'DEL'],
    ['Gregor Kobel', 'POR'], ['Fabian Schär', 'DEF'], ['Denis Zakaria', 'MED'], ['Fabian Rieder', 'MED'], ['Dan Ndoye', 'DEL'], ['Ruben Vargas', 'DEL'], ['Cédric Itten', 'DEL'],
  ],
  BOS: [
    ['Nikola Vasilj', 'POR'], ['Sead Kolašinac', 'DEF'], ['Amar Dedić', 'DEF'], ['Anel Ahmedhodžić', 'DEF'], ['Dennis Hadžikadunić', 'DEF'],
    ['Miralem Pjanić', 'MED'], ['Benjamin Tahirović', 'MED'], ['Edin Višća', 'MED'],
    ['Edin Džeko', 'DEL'], ['Ermedin Demirović', 'DEL'], ['Smail Prevljak', 'DEL'],
    ['Ibrahim Šehić', 'POR'], ['Nihad Mujakić', 'DEF'], ['Gojko Cimirot', 'MED'], ['Armin Gigović', 'MED'], ['Haris Hajradinović', 'MED'], ['Said Hamulić', 'DEL'], ['Dženis Burnić', 'MED'],
  ],

  // ── Grupo C ──
  BRA: [
    ['Alisson', 'POR'], ['Danilo', 'DEF'], ['Marquinhos', 'DEF'], ['Gabriel Magalhães', 'DEF'], ['Wendell', 'DEF'],
    ['Bruno Guimarães', 'MED'], ['Lucas Paquetá', 'MED'], ['Rodrygo', 'MED'],
    ['Vinícius Júnior', 'DEL'], ['Raphinha', 'DEL'], ['Endrick', 'DEL'],
    ['Ederson', 'POR'], ['Éder Militão', 'DEF'], ['Bremer', 'DEF'], ['André', 'MED'], ['Gerson', 'MED'], ['Savinho', 'DEL'], ['Gabriel Martinelli', 'DEL'],
  ],
  MAR: [
    ['Yassine Bounou', 'POR'], ['Achraf Hakimi', 'DEF'], ['Nayef Aguerd', 'DEF'], ['Romain Saïss', 'DEF'], ['Noussair Mazraoui', 'DEF'],
    ['Sofyan Amrabat', 'MED'], ['Azzedine Ounahi', 'MED'], ['Bilal El Khannouss', 'MED'],
    ['Hakim Ziyech', 'DEL'], ['Youssef En-Nesyri', 'DEL'], ['Brahim Díaz', 'DEL'],
    ['Munir Mohamedi', 'POR'], ['Achraf Dari', 'DEF'], ['Amine Harit', 'MED'], ['Sofiane Boufal', 'DEL'], ['Abde Ezzalzouli', 'DEL'], ['Zakaria Aboukhlal', 'DEL'], ['Ayoub El Kaabi', 'DEL'],
  ],
  ESC: [
    ['Angus Gunn', 'POR'], ['Anthony Ralston', 'DEF'], ['Jack Hendry', 'DEF'], ['Grant Hanley', 'DEF'], ['Andy Robertson', 'DEF'],
    ['Scott McTominay', 'MED'], ['Callum McGregor', 'MED'], ['Billy Gilmour', 'MED'], ['John McGinn', 'MED'],
    ['Che Adams', 'DEL'], ['Lyndon Dykes', 'DEL'],
    ['Craig Gordon', 'POR'], ['Kieran Tierney', 'DEF'], ['Scott McKenna', 'DEF'], ['Ryan Christie', 'MED'], ['Stuart Armstrong', 'MED'], ['Lewis Ferguson', 'MED'], ['Lawrence Shankland', 'DEL'],
  ],
  HAI: [
    ['Johny Placide', 'POR'], ['Carlens Arcus', 'DEF'], ['Ricardo Adé', 'DEF'], ['Hannes Delcroix', 'DEF'], ['Jean-Kévin Duverne', 'DEF'],
    ['Danley Jean Jacques', 'MED'], ['Carl Sainté', 'MED'], ['Leverton Pierre', 'MED'],
    ['Frantzdy Pierrot', 'DEL'], ['Duckens Nazon', 'DEL'], ['Derrick Etienne', 'DEL'],
    ['Josué Duverger', 'POR'], ['Garven Metusala', 'DEF'], ['Steeven Saba', 'MED'], ['Jems Geffrard', 'DEF'], ['Don Deedson Louicius', 'DEL'], ['Ronaldo Damus', 'DEL'], ['Fafà Picault', 'DEL'],
  ],

  // ── Grupo D ──
  USA: [
    ['Matt Turner', 'POR'], ['Sergiño Dest', 'DEF'], ['Chris Richards', 'DEF'], ['Tim Ream', 'DEF'], ['Antonee Robinson', 'DEF'],
    ['Tyler Adams', 'MED'], ['Weston McKennie', 'MED'], ['Yunus Musah', 'MED'],
    ['Christian Pulisic', 'DEL'], ['Folarin Balogun', 'DEL'], ['Tim Weah', 'DEL'],
    ['Ethan Horvath', 'POR'], ['Joe Scally', 'DEF'], ['Cameron Carter-Vickers', 'DEF'], ['Gio Reyna', 'MED'], ['Brenden Aaronson', 'MED'], ['Ricardo Pepi', 'DEL'], ['Haji Wright', 'DEL'],
  ],
  PAR: [
    ['Roberto Fernández', 'POR'], ['Gustavo Velázquez', 'DEF'], ['Omar Alderete', 'DEF'], ['Fabián Balbuena', 'DEF'], ['Juan Cáceres', 'DEF'],
    ['Andrés Cubas', 'MED'], ['Mathías Villasanti', 'MED'], ['Diego Gómez', 'MED'], ['Miguel Almirón', 'MED'],
    ['Antonio Sanabria', 'DEL'], ['Julio Enciso', 'DEL'],
    ['Carlos Coronel', 'POR'], ['Junior Alonso', 'DEF'], ['Damián Bobadilla', 'MED'], ['Ramón Sosa', 'DEL'], ['Ángel Romero', 'DEL'], ['Gabriel Ávalos', 'DEL'], ['Alejandro Romero Gamarra', 'MED'],
  ],
  AUS: [
    ['Mathew Ryan', 'POR'], ['Nathaniel Atkinson', 'DEF'], ['Harry Souttar', 'DEF'], ['Kye Rowles', 'DEF'], ['Aziz Behich', 'DEF'],
    ['Jackson Irvine', 'MED'], ['Connor Metcalfe', 'MED'], ['Riley McGree', 'MED'],
    ['Mathew Leckie', 'DEL'], ['Mitchell Duke', 'DEL'], ['Craig Goodwin', 'DEL'],
    ['Joe Gauci', 'POR'], ['Jordan Bos', 'DEF'], ['Cameron Devlin', 'MED'], ['Aiden O’Neill', 'MED'], ['Martin Boyle', 'DEL'], ['Sammy Silvera', 'DEL'], ['Kusini Yengi', 'DEL'],
  ],
  TUR: [
    ['Mert Günok', 'POR'], ['Zeki Çelik', 'DEF'], ['Merih Demiral', 'DEF'], ['Abdülkerim Bardakcı', 'DEF'], ['Ferdi Kadıoğlu', 'DEF'],
    ['Hakan Çalhanoğlu', 'MED'], ['İsmail Yüksek', 'MED'], ['Arda Güler', 'MED'], ['Kenan Yıldız', 'MED'],
    ['Kerem Aktürkoğlu', 'DEL'], ['Barış Alper Yılmaz', 'DEL'],
    ['Uğurcan Çakır', 'POR'], ['Samet Akaydın', 'DEF'], ['Orkun Kökçü', 'MED'], ['Salih Özcan', 'MED'], ['Yusuf Yazıcı', 'DEL'], ['Cengiz Ünder', 'DEL'], ['Semih Kılıçsoy', 'DEL'],
  ],

  // ── Grupo E ──
  ALE: [
    ['Manuel Neuer', 'POR'], ['Joshua Kimmich', 'DEF'], ['Antonio Rüdiger', 'DEF'], ['Jonathan Tah', 'DEF'], ['David Raum', 'DEF'],
    ['Robert Andrich', 'MED'], ['İlkay Gündoğan', 'MED'], ['Jamal Musiala', 'MED'], ['Florian Wirtz', 'MED'],
    ['Kai Havertz', 'DEL'], ['Niclas Füllkrug', 'DEL'],
    ['Marc-André ter Stegen', 'POR'], ['Nico Schlotterbeck', 'DEF'], ['Leon Goretzka', 'MED'], ['Pascal Groß', 'MED'], ['Leroy Sané', 'DEL'], ['Serge Gnabry', 'DEL'], ['Deniz Undav', 'DEL'],
  ],
  ECU: [
    ['Hernán Galíndez', 'POR'], ['Ángelo Preciado', 'DEF'], ['Piero Hincapié', 'DEF'], ['Willian Pacho', 'DEF'], ['Pervis Estupiñán', 'DEF'],
    ['Moisés Caicedo', 'MED'], ['Alan Franco', 'MED'], ['Jeremy Sarmiento', 'MED'],
    ['Enner Valencia', 'DEL'], ['Kendry Páez', 'DEL'], ['Gonzalo Plata', 'DEL'],
    ['Alexander Domínguez', 'POR'], ['Félix Torres', 'DEF'], ['José Cifuentes', 'MED'], ['Ángel Mena', 'MED'], ['Kevin Rodríguez', 'DEL'], ['Nilson Angulo', 'DEL'], ['Jordy Caicedo', 'DEL'],
  ],
  CDM: [
    ['Yahia Fofana', 'POR'], ['Serge Aurier', 'DEF'], ['Willy Boly', 'DEF'], ['Odilon Kossounou', 'DEF'], ['Ghislain Konan', 'DEF'],
    ['Franck Kessié', 'MED'], ['Ibrahim Sangaré', 'MED'], ['Jean Michaël Seri', 'MED'],
    ['Nicolas Pépé', 'DEL'], ['Sébastien Haller', 'DEL'], ['Simon Adingra', 'DEL'],
    ['Badra Ali Sangaré', 'POR'], ['Evan Ndicka', 'DEF'], ['Wilfried Singo', 'DEF'], ['Seko Fofana', 'MED'], ['Jean-Philippe Krasso', 'DEL'], ['Max Gradel', 'DEL'], ['Christian Kouamé', 'DEL'],
  ],
  CUR: [
    ['Eloy Room', 'POR'], ['Cuco Martina', 'DEF'], ['Juriën Gaari', 'DEF'], ['Shaquille Pinas', 'DEF'], ['Roshon van Eijma', 'DEF'],
    ['Leandro Bacuna', 'MED'], ['Jurich Carolina', 'MED'], ['Sherel Floranus', 'MED'],
    ['Tahith Chong', 'DEL'], ['Gervane Kastaneer', 'DEL'], ['Kenji Gorré', 'DEL'],
    ['Eric Oelschlägel', 'POR'], ['Darryl Lachman', 'DEF'], ['Jarchinio Antonia', 'MED'], ['Brandley Kuwas', 'DEL'], ['Rangelo Janga', 'DEL'], ['Charlison Benschop', 'DEL'], ['Felitciano Zschusschen', 'DEL'],
  ],

  // ── Grupo F ──
  PBA: [
    ['Bart Verbruggen', 'POR'], ['Denzel Dumfries', 'DEF'], ['Virgil van Dijk', 'DEF'], ['Stefan de Vrij', 'DEF'], ['Nathan Aké', 'DEF'],
    ['Frenkie de Jong', 'MED'], ['Tijjani Reijnders', 'MED'], ['Xavi Simons', 'MED'],
    ['Memphis Depay', 'DEL'], ['Cody Gakpo', 'DEL'], ['Donyell Malen', 'DEL'],
    ['Mark Flekken', 'POR'], ['Micky van de Ven', 'DEF'], ['Georginio Wijnaldum', 'MED'], ['Joey Veerman', 'MED'], ['Steven Bergwijn', 'DEL'], ['Wout Weghorst', 'DEL'], ['Brian Brobbey', 'DEL'],
  ],
  JAP: [
    ['Zion Suzuki', 'POR'], ['Hiroki Sakai', 'DEF'], ['Ko Itakura', 'DEF'], ['Takehiro Tomiyasu', 'DEF'], ['Hiroki Itō', 'DEF'],
    ['Wataru Endō', 'MED'], ['Hidemasa Morita', 'MED'], ['Daichi Kamada', 'MED'], ['Takefusa Kubo', 'MED'],
    ['Kaoru Mitoma', 'DEL'], ['Ayase Ueda', 'DEL'],
    ['Daniel Schmidt', 'POR'], ['Yukinari Sugawara', 'DEF'], ['Ao Tanaka', 'MED'], ['Reo Hatate', 'MED'], ['Junya Itō', 'DEL'], ['Ritsu Dōan', 'DEL'], ['Takumi Minamino', 'DEL'],
  ],
  TUN: [
    ['Aymen Dahmen', 'POR'], ['Mohamed Dräger', 'DEF'], ['Yassine Meriah', 'DEF'], ['Montassar Talbi', 'DEF'], ['Ali Maaloul', 'DEF'],
    ['Aïssa Laïdouni', 'MED'], ['Ellyes Skhiri', 'MED'], ['Hannibal Mejbri', 'MED'],
    ['Youssef Msakni', 'DEL'], ['Naïm Sliti', 'DEL'], ['Elias Saad', 'DEL'],
    ['Béchir Ben Saïd', 'POR'], ['Dylan Bronn', 'DEF'], ['Ferjani Sassi', 'MED'], ['Anis Ben Slimane', 'MED'], ['Seifeddine Jaziri', 'DEL'], ['Wahbi Khazri', 'DEL'], ['Saîf-Eddine Khaoui', 'MED'],
  ],
  SWE: [
    ['Robin Olsen', 'POR'], ['Emil Krafth', 'DEF'], ['Victor Lindelöf', 'DEF'], ['Isak Hien', 'DEF'], ['Ludwig Augustinsson', 'DEF'],
    ['Albin Ekdal', 'MED'], ['Mattias Svanberg', 'MED'], ['Hugo Larsson', 'MED'],
    ['Dejan Kulusevski', 'DEL'], ['Alexander Isak', 'DEL'], ['Anthony Elanga', 'DEL'],
    ['Kristoffer Nordfeldt', 'POR'], ['Daniel Svensson', 'DEF'], ['Jens Cajuste', 'MED'], ['Emil Forsberg', 'MED'], ['Viktor Gyökeres', 'DEL'], ['Jesper Karlsson', 'DEL'], ['Gustav Nilsson', 'DEL'],
  ],

  // ── Grupo G ──
  BEL: [
    ['Koen Casteels', 'POR'], ['Timothy Castagne', 'DEF'], ['Wout Faes', 'DEF'], ['Jan Vertonghen', 'DEF'], ['Arthur Theate', 'DEF'],
    ['Kevin De Bruyne', 'MED'], ['Youri Tielemans', 'MED'], ['Amadou Onana', 'MED'],
    ['Jérémy Doku', 'DEL'], ['Romelu Lukaku', 'DEL'], ['Leandro Trossard', 'DEL'],
    ['Thibaut Courtois', 'POR'], ['Zeno Debast', 'DEF'], ['Orel Mangala', 'MED'], ['Charles De Ketelaere', 'MED'], ['Dodi Lukebakio', 'DEL'], ['Yannick Carrasco', 'DEL'], ['Loïs Openda', 'DEL'],
  ],
  IRA: [
    ['Alireza Beiranvand', 'POR'], ['Sadegh Moharrami', 'DEF'], ['Majid Hosseini', 'DEF'], ['Shojae Khalilzadeh', 'DEF'], ['Ehsan Hajsafi', 'DEF'],
    ['Saeid Ezatolahi', 'MED'], ['Ahmad Nourollahi', 'MED'], ['Alireza Jahanbakhsh', 'MED'],
    ['Mehdi Taremi', 'DEL'], ['Sardar Azmoun', 'DEL'], ['Karim Ansarifard', 'DEL'],
    ['Amir Abedzadeh', 'POR'], ['Ramin Rezaeian', 'DEF'], ['Omid Ebrahimi', 'MED'], ['Saman Ghoddos', 'MED'], ['Ali Gholizadeh', 'DEL'], ['Mehdi Ghayedi', 'DEL'], ['Allahyar Sayyadmanesh', 'DEL'],
  ],
  EGI: [
    ['Mohamed El Shenawy', 'POR'], ['Ahmed Hegazi', 'DEF'], ['Mohamed Abdelmonem', 'DEF'], ['Ahmed Fatouh', 'DEF'], ['Omar Kamal', 'DEF'],
    ['Mohamed Elneny', 'MED'], ['Hamdi Fathi', 'MED'], ['Emam Ashour', 'MED'],
    ['Mohamed Salah', 'DEL'], ['Omar Marmoush', 'DEL'], ['Mostafa Mohamed', 'DEL'],
    ['Mohamed Sobhi', 'POR'], ['Akram Tawfik', 'DEF'], ['Tarek Hamed', 'MED'], ['Trezeguet', 'DEL'], ['Zizo', 'DEL'], ['Ramadan Sobhi', 'DEL'], ['Marwan Hamdy', 'DEL'],
  ],
  NZL: [
    ['Max Crocombe', 'POR'], ['Tyler Bindon', 'DEF'], ['Michael Boxall', 'DEF'], ['Nando Pijnaker', 'DEF'], ['Liberato Cacace', 'DEF'],
    ['Joe Bell', 'MED'], ['Marko Stamenić', 'MED'], ['Matthew Garbett', 'MED'],
    ['Chris Wood', 'DEL'], ['Ben Waine', 'DEL'], ['Elijah Just', 'DEL'],
    ['Alex Paulsen', 'POR'], ['Bill Tuiloma', 'DEF'], ['Clayton Lewis', 'MED'], ['Sarpreet Singh', 'MED'], ['Kosta Barbarouses', 'DEL'], ['Callum McCowatt', 'DEL'], ['Eli Just', 'DEL'],
  ],

  // ── Grupo H ──
  ESP: [
    ['Unai Simón', 'POR'], ['Dani Carvajal', 'DEF'], ['Robin Le Normand', 'DEF'], ['Aymeric Laporte', 'DEF'], ['Marc Cucurella', 'DEF'],
    ['Rodri', 'MED'], ['Pedri', 'MED'], ['Fabián Ruiz', 'MED'],
    ['Lamine Yamal', 'DEL'], ['Álvaro Morata', 'DEL'], ['Nico Williams', 'DEL'],
    ['David Raya', 'POR'], ['Pau Cubarsí', 'DEF'], ['Mikel Merino', 'MED'], ['Martín Zubimendi', 'MED'], ['Dani Olmo', 'DEL'], ['Mikel Oyarzabal', 'DEL'], ['Ferran Torres', 'DEL'],
  ],
  URU: [
    ['Sergio Rochet', 'POR'], ['Nahitan Nández', 'DEF'], ['José María Giménez', 'DEF'], ['Ronald Araújo', 'DEF'], ['Mathías Olivera', 'DEF'],
    ['Federico Valverde', 'MED'], ['Manuel Ugarte', 'MED'], ['Nicolás de la Cruz', 'MED'], ['Facundo Pellistri', 'MED'],
    ['Darwin Núñez', 'DEL'], ['Maxi Araújo', 'DEL'],
    ['Franco Israel', 'POR'], ['Sebastián Cáceres', 'DEF'], ['Rodrigo Bentancur', 'MED'], ['Giorgian de Arrascaeta', 'MED'], ['Brian Rodríguez', 'DEL'], ['Agustín Canobbio', 'DEL'], ['Cristian Olivera', 'DEL'],
  ],
  ARA: [
    ['Mohammed Al-Owais', 'POR'], ['Saud Abdulhamid', 'DEF'], ['Ali Al-Bulayhi', 'DEF'], ['Hassan Tambakti', 'DEF'], ['Yasser Al-Shahrani', 'DEF'],
    ['Mohamed Kanno', 'MED'], ['Nasser Al-Dawsari', 'MED'], ['Sami Al-Najei', 'MED'], ['Salem Al-Dawsari', 'MED'],
    ['Firas Al-Buraikan', 'DEL'], ['Saleh Al-Shehri', 'DEL'],
    ['Nawaf Al-Aqidi', 'POR'], ['Ali Lajami', 'DEF'], ['Musab Al-Juwayr', 'MED'], ['Hattan Bahebri', 'MED'], ['Abdulrahman Ghareeb', 'DEL'], ['Abdullah Al-Hamdan', 'DEL'], ['Abdullah Radif', 'DEL'],
  ],
  CAB: [
    ['Vozinha', 'POR'], ['Stopira', 'DEF'], ['Diney', 'DEF'], ['Roberto Lopes', 'DEF'], ['Logan Costa', 'DEF'],
    ['Kevin Pina', 'MED'], ['Jamiro Monteiro', 'MED'], ['Deroy Duarte', 'MED'],
    ['Ryan Mendes', 'DEL'], ['Garry Rodrigues', 'DEL'], ['Bebé', 'DEL'],
    ['Márcio Rosa', 'POR'], ['Sidny Cabral', 'DEF'], ['Gilson Tavares', 'MED'], ['Dailon Livramento', 'MED'], ['Júlio Tavares', 'DEL'], ['Willy Semedo', 'DEL'], ['Bryan Teixeira', 'DEL'],
  ],

  // ── Grupo I ──
  FRA: [
    ['Mike Maignan', 'POR'], ['Jules Koundé', 'DEF'], ['Dayot Upamecano', 'DEF'], ['William Saliba', 'DEF'], ['Theo Hernández', 'DEF'],
    ['Aurélien Tchouaméni', 'MED'], ['Eduardo Camavinga', 'MED'], ['Antoine Griezmann', 'MED'],
    ['Ousmane Dembélé', 'DEL'], ['Kylian Mbappé', 'DEL'], ['Marcus Thuram', 'DEL'],
    ['Brice Samba', 'POR'], ['Ibrahima Konaté', 'DEF'], ['Adrien Rabiot', 'MED'], ['N’Golo Kanté', 'MED'], ['Michael Olise', 'DEL'], ['Bradley Barcola', 'DEL'], ['Randal Kolo Muani', 'DEL'],
  ],
  SEN: [
    ['Édouard Mendy', 'POR'], ['Youssouf Sabaly', 'DEF'], ['Kalidou Koulibaly', 'DEF'], ['Abdou Diallo', 'DEF'], ['Ismail Jakobs', 'DEF'],
    ['Idrissa Gueye', 'MED'], ['Pape Matar Sarr', 'MED'], ['Lamine Camara', 'MED'],
    ['Sadio Mané', 'DEL'], ['Nicolas Jackson', 'DEL'], ['Ismaïla Sarr', 'DEL'],
    ['Seny Dieng', 'POR'], ['Moussa Niakhaté', 'DEF'], ['Pathé Ciss', 'MED'], ['Krépin Diatta', 'MED'], ['Habib Diallo', 'DEL'], ['Boulaye Dia', 'DEL'], ['Iliman Ndiaye', 'DEL'],
  ],
  NOR: [
    ['Ørjan Nyland', 'POR'], ['Kristoffer Ajer', 'DEF'], ['Leo Østigård', 'DEF'], ['Stian Gregersen', 'DEF'], ['Birger Meling', 'DEF'],
    ['Martin Ødegaard', 'MED'], ['Sander Berge', 'MED'], ['Fredrik Aursnes', 'MED'],
    ['Antonio Nusa', 'DEL'], ['Erling Haaland', 'DEL'], ['Alexander Sørloth', 'DEL'],
    ['Egil Selvik', 'POR'], ['Julian Ryerson', 'DEF'], ['Patrick Berg', 'MED'], ['Morten Thorsby', 'MED'], ['Oscar Bobb', 'DEL'], ['Jørgen Strand Larsen', 'DEL'], ['Mohamed Elyounoussi', 'DEL'],
  ],
  IRK: [
    ['Jalal Hassan', 'POR'], ['Merchas Doski', 'DEF'], ['Rebin Sulaka', 'DEF'], ['Akam Hashim', 'DEF'], ['Zaid Tahseen', 'DEF'],
    ['Amir Al-Ammari', 'MED'], ['Ibrahim Bayesh', 'MED'], ['Bashar Resan', 'MED'],
    ['Aymen Hussein', 'DEL'], ['Mohanad Ali', 'DEL'], ['Ali Jasim', 'DEL'],
    ['Ahmad Basil', 'POR'], ['Hussein Ali', 'DEF'], ['Zidane Iqbal', 'MED'], ['Manaf Younis', 'MED'], ['Youssef Amyn', 'DEL'], ['Sherko Kareem', 'DEL'], ['Muntadher Mohammed', 'DEL'],
  ],

  // ── Grupo J ──
  ARG: [
    ['Emiliano Martínez', 'POR'], ['Nahuel Molina', 'DEF'], ['Cristian Romero', 'DEF'], ['Nicolás Otamendi', 'DEF'], ['Nicolás Tagliafico', 'DEF'],
    ['Rodrigo De Paul', 'MED'], ['Enzo Fernández', 'MED'], ['Alexis Mac Allister', 'MED'],
    ['Lionel Messi', 'DEL'], ['Lautaro Martínez', 'DEL'], ['Julián Álvarez', 'DEL'],
    ['Gerónimo Rulli', 'POR'], ['Lisandro Martínez', 'DEF'], ['Leandro Paredes', 'MED'], ['Giovani Lo Celso', 'MED'], ['Ángel Correa', 'DEL'], ['Nicolás González', 'DEL'], ['Alejandro Garnacho', 'DEL'],
  ],
  ALG: [
    ['Anthony Mandrea', 'POR'], ['Youcef Atal', 'DEF'], ['Aïssa Mandi', 'DEF'], ['Ahmed Touba', 'DEF'], ['Ramy Bensebaini', 'DEF'],
    ['Nabil Bentaleb', 'MED'], ['Ismaël Bennacer', 'MED'], ['Houssem Aouar', 'MED'],
    ['Riyad Mahrez', 'DEL'], ['Mohamed Amoura', 'DEL'], ['Yacine Brahimi', 'DEL'],
    ['Oussama Benbot', 'POR'], ['Jaouen Hadjam', 'DEF'], ['Adam Ounas', 'MED'], ['Saïd Benrahma', 'DEL'], ['Amine Gouiri', 'DEL'], ['Baghdad Bounedjah', 'DEL'], ['Islam Slimani', 'DEL'],
  ],
  AUT: [
    ['Patrick Pentz', 'POR'], ['Stefan Posch', 'DEF'], ['Kevin Danso', 'DEF'], ['Philipp Lienhart', 'DEF'], ['Phillipp Mwene', 'DEF'],
    ['Konrad Laimer', 'MED'], ['Nicolas Seiwald', 'MED'], ['Christoph Baumgartner', 'MED'], ['Marcel Sabitzer', 'MED'],
    ['Marko Arnautović', 'DEL'], ['Michael Gregoritsch', 'DEL'],
    ['Alexander Schlager', 'POR'], ['David Alaba', 'DEF'], ['Maximilian Wöber', 'DEF'], ['Florian Grillitsch', 'MED'], ['Romano Schmid', 'MED'], ['Patrick Wimmer', 'DEL'], ['Junior Adamu', 'DEL'],
  ],
  JOR: [
    ['Yazeed Abulaila', 'POR'], ['Mahmoud Al-Mardi', 'DEF'], ['Yazan Al-Arab', 'DEF'], ['Abdallah Nasib', 'DEF'], ['Salem Al-Ajalin', 'DEF'],
    ['Noor Al-Rawabdeh', 'MED'], ['Ehsan Haddad', 'MED'], ['Nizar Al-Rashdan', 'MED'],
    ['Musa Al-Taamari', 'DEL'], ['Yazan Al-Naimat', 'DEL'], ['Ali Olwan', 'DEL'],
    ['Abdullah Al-Fakhouri', 'POR'], ['Bara Marei', 'DEF'], ['Mahmoud Zaqzeeq', 'MED'], ['Saleh Rateb', 'MED'], ['Mahmoud Al-Mawas', 'DEL'], ['Mohammad Abu Hashish', 'DEL'], ['Ibrahim Sadeh', 'DEL'],
  ],

  // ── Grupo K ──
  POR: [
    ['Diogo Costa', 'POR'], ['Diogo Dalot', 'DEF'], ['Rúben Dias', 'DEF'], ['Pepe', 'DEF'], ['Nuno Mendes', 'DEF'],
    ['João Palhinha', 'MED'], ['Bruno Fernandes', 'MED'], ['Vitinha', 'MED'], ['Bernardo Silva', 'MED'],
    ['Cristiano Ronaldo', 'DEL'], ['Rafael Leão', 'DEL'],
    ['José Sá', 'POR'], ['Nélson Semedo', 'DEF'], ['Rúben Neves', 'MED'], ['Gonçalo Ramos', 'DEL'], ['Diogo Jota', 'DEL'], ['João Félix', 'DEL'], ['Pedro Neto', 'DEL'],
  ],
  UZB: [
    ['Utkir Yusupov', 'POR'], ['Abdukodir Khusanov', 'DEF'], ['Rustamjon Ashurmatov', 'DEF'], ['Sherzod Nasrullaev', 'DEF'], ['Farrukh Sayfiev', 'DEF'],
    ['Jaloliddin Masharipov', 'MED'], ['Otabek Shukurov', 'MED'], ['Abbosbek Fayzullaev', 'MED'],
    ['Eldor Shomurodov', 'DEL'], ['Igor Sergeev', 'DEL'], ['Oston Urunov', 'DEL'],
    ['Botirali Ergashev', 'POR'], ['Khojiakbar Alijonov', 'DEF'], ['Odiljon Hamrobekov', 'MED'], ['Jasurbek Jaloliddinov', 'MED'], ['Azizbek Turgunboev', 'DEL'], ['Bobir Abdixolikov', 'DEL'], ['Jaloliddin Khamroboev', 'DEL'],
  ],
  COL: [
    ['Camilo Vargas', 'POR'], ['Daniel Muñoz', 'DEF'], ['Dávinson Sánchez', 'DEF'], ['Yerry Mina', 'DEF'], ['Johan Mojica', 'DEF'],
    ['Jefferson Lerma', 'MED'], ['Richard Ríos', 'MED'], ['James Rodríguez', 'MED'],
    ['Luis Díaz', 'DEL'], ['Jhon Córdoba', 'DEL'], ['Jhon Arias', 'DEL'],
    ['David Ospina', 'POR'], ['Carlos Cuesta', 'DEF'], ['Kevin Castaño', 'MED'], ['Juan Fernando Quintero', 'MED'], ['Jorge Carrascal', 'DEL'], ['Luis Sinisterra', 'DEL'], ['Rafael Santos Borré', 'DEL'],
  ],
  JAM: [
    ['Andre Blake', 'POR'], ['Dexter Lembikisa', 'DEF'], ['Ethan Pinnock', 'DEF'], ['Damion Lowe', 'DEF'], ['Amari’i Bell', 'DEF'],
    ['Bobby Decordova-Reid', 'MED'], ['Kasey Palmer', 'MED'], ['Joel Latibeaudiere', 'MED'],
    ['Leon Bailey', 'DEL'], ['Michail Antonio', 'DEL'], ['Demarai Gray', 'DEL'],
    ['Jahmali Waite', 'POR'], ['Greg Leigh', 'DEF'], ['Di’Shon Bernard', 'DEF'], ['Tyreek Magee', 'MED'], ['Renaldo Cephas', 'DEL'], ['Shamar Nicholson', 'DEL'], ['Kaheim Dixon', 'DEL'],
  ],

  // ── Grupo L ──
  ING: [
    ['Jordan Pickford', 'POR'], ['Kyle Walker', 'DEF'], ['John Stones', 'DEF'], ['Marc Guéhi', 'DEF'], ['Kieran Trippier', 'DEF'],
    ['Declan Rice', 'MED'], ['Jude Bellingham', 'MED'], ['Phil Foden', 'MED'],
    ['Bukayo Saka', 'DEL'], ['Harry Kane', 'DEL'], ['Cole Palmer', 'DEL'],
    ['Aaron Ramsdale', 'POR'], ['Ezri Konsa', 'DEF'], ['Trent Alexander-Arnold', 'DEF'], ['Conor Gallagher', 'MED'], ['Anthony Gordon', 'DEL'], ['Ollie Watkins', 'DEL'], ['Jarrod Bowen', 'DEL'],
  ],
  CRO: [
    ['Dominik Livaković', 'POR'], ['Josip Stanišić', 'DEF'], ['Joško Gvardiol', 'DEF'], ['Josip Šutalo', 'DEF'], ['Borna Sosa', 'DEF'],
    ['Luka Modrić', 'MED'], ['Marcelo Brozović', 'MED'], ['Mateo Kovačić', 'MED'], ['Mario Pašalić', 'MED'],
    ['Andrej Kramarić', 'DEL'], ['Bruno Petković', 'DEL'],
    ['Ivica Ivušić', 'POR'], ['Josip Juranović', 'DEF'], ['Martin Baturina', 'MED'], ['Lovro Majer', 'MED'], ['Nikola Vlašić', 'DEL'], ['Ante Budimir', 'DEL'], ['Igor Matanović', 'DEL'],
  ],
  GHA: [
    ['Lawrence Ati-Zigi', 'POR'], ['Tariq Lamptey', 'DEF'], ['Mohammed Salisu', 'DEF'], ['Alexander Djiku', 'DEF'], ['Gideon Mensah', 'DEF'],
    ['Thomas Partey', 'MED'], ['Mohammed Kudus', 'MED'], ['Elisha Owusu', 'MED'],
    ['Jordan Ayew', 'DEL'], ['Iñaki Williams', 'DEL'], ['Antoine Semenyo', 'DEL'],
    ['Joseph Wollacott', 'POR'], ['Jerome Opoku', 'DEF'], ['Majeed Ashimeru', 'MED'], ['Kamaldeen Sulemana', 'DEL'], ['Ernest Nuamah', 'DEL'], ['Abdul Fatawu Issahaku', 'DEL'], ['Brandon Thomas-Asante', 'DEL'],
  ],
  PAN: [
    ['Orlando Mosquera', 'POR'], ['Michael Murillo', 'DEF'], ['Roderick Miller', 'DEF'], ['Andrés Andrade', 'DEF'], ['Eric Davis', 'DEF'],
    ['Adalberto Carrasquilla', 'MED'], ['Aníbal Godoy', 'MED'], ['Cristian Martínez', 'MED'],
    ['Ismael Díaz', 'DEL'], ['José Fajardo', 'DEL'], ['Cecilio Waterman', 'DEL'],
    ['José Guerra', 'POR'], ['Jorge Gutiérrez', 'DEF'], ['Édgar Bárcenas', 'MED'], ['Tomás Rodríguez', 'MED'], ['Azarías Londoño', 'DEL'], ['Gabriel Torres', 'DEL'], ['Eduardo Guerrero', 'DEL'],
  ],
}

function buildRoster(entries: Entry[]): Roster {
  const players: Player[] = entries.map(([name, position], i) => ({
    id: `${i + 1}`,
    name,
    number: i + 1,
    position,
  }))
  return { starters: players.slice(0, 11), subs: players.slice(11) }
}

// Plantilla genérica de respaldo por si algún equipo no estuviera en SQUADS.
function genericRoster(teamId: string): Roster {
  const layout: Pos[] = ['POR', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL', 'POR', 'DEF', 'DEF', 'MED', 'MED', 'DEL', 'DEL']
  return buildRoster(layout.map((p, i) => [`${teamId} ${i + 1}`, p]))
}

const ROSTERS: Record<string, Roster> = Object.fromEntries(
  TEAMS.map((t) => [t.id, SQUADS[t.id] ? buildRoster(SQUADS[t.id]) : genericRoster(t.id)]),
)

// Sobrescribí acá si querés ajustar manualmente la plantilla de algún equipo.
export const ROSTER_OVERRIDES: Record<string, Roster> = {}

export function getRoster(teamId: string | undefined): Roster | null {
  if (!teamId) return null
  return ROSTER_OVERRIDES[teamId] ?? ROSTERS[teamId] ?? null
}
