// Synthetic bounded regression for both Penpot Guava namespaces. No sockets/files.
import java.io.*;
import java.lang.reflect.*;
import java.util.*;

public class GuavaSerializationCheck {
  static Object collection(String prefix, String kind, int size) throws Exception {
    Object value;
    if (kind.equals("MapMaker")) {
      Class<?> maker = Class.forName(prefix + ".MapMaker");
      Object builder = maker.getConstructor().newInstance();
      maker.getMethod("weakKeys").invoke(builder);
      value = maker.getMethod("makeMap").invoke(builder);
    } else {
      Constructor<?> constructor = Class.forName(prefix + "." + kind).getDeclaredConstructor();
      constructor.setAccessible(true);
      value = constructor.newInstance();
    }
    for (int i = 0; i < size; i++) {
      String item = ("FICTIONAL-" + i).intern();
      if (value instanceof Map) ((Map<Object,Object>) value).put(item, item);
      else ((Set<Object>) value).add(item);
    }
    return value;
  }
  static byte[] encode(Object value) throws Exception {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (ObjectOutputStream output = new ObjectOutputStream(bytes)) { output.writeObject(value); }
    return bytes.toByteArray();
  }
  static Object decode(byte[] bytes) throws Exception {
    try (ObjectInputStream input = new ObjectInputStream(new ByteArrayInputStream(bytes))) { return input.readObject(); }
  }
  static SortedSet<String> entries(Object value) {
    SortedSet<String> result = new TreeSet<>();
    if (value instanceof Map) ((Map<?,?>) value).forEach((k,v) -> result.add(k + "=" + v));
    else for (Object item : (Set<?>) value) result.add(item.toString());
    return result;
  }
  public static void main(String[] args) throws Exception {
    if (args.length != 3) throw new IllegalArgumentException("namespace, collection and expected baseline/fixed required");
    String prefix = args[0], kind = args[1];
    boolean fixed = args[2].equals("fixed");
    if (!fixed && !args[2].equals("baseline")) throw new IllegalArgumentException("unsupported state");
    for (int size : new int[]{0,1,2,257,1000}) {
      Object original = collection(prefix, kind, size), restored = decode(encode(original));
      if (!entries(original).equals(entries(restored))) throw new AssertionError("Legitimate serialization changed");
    }
    byte[] bytes = encode(collection(prefix, kind, 1));
    int offset = -1, matches = 0;
    for (int i = 0; i + 5 < bytes.length; i++) {
      if ((bytes[i]&255)==0x77 && bytes[i+1]==4 && bytes[i+2]==0 && bytes[i+3]==0 && bytes[i+4]==0 && bytes[i+5]==1) {
        offset=i+2; matches++;
      }
    }
    if (matches != 1) throw new AssertionError("Ambiguous declared-size field: " + matches);
    bytes[offset]=0x3f; bytes[offset+1]=(byte)255; bytes[offset+2]=(byte)255; bytes[offset+3]=(byte)255;
    boolean oom=false;
    try { decode(bytes); } catch (OutOfMemoryError expected) { oom=true; }
    catch (IOException expected) { /* Truncated compact collections must reject. */ }
    if (oom == fixed) throw new AssertionError("Unexpected memory-allocation outcome");
    System.out.println("{\"passed\":true,\"legitimateChecks\":5,\"outOfMemory\":"+oom+",\"fixed\":"+fixed+"}");
  }
}
