function load_script(src, remote = true, transfer = []) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function doJb() {

  logger.info("====================================");
  logger.info("      CHIFIX PRO GAME");
  logger.info("====================================");
  logger.info("Initializing Host...");
  logger.info("Loading Exploit...");
  logger.info("");

  await load_script("src/misc.js");

  try {
    version.init();

    logger.info(`Console Detected: PS${version.console}`);

    switch (version.console) {
      case 4:
        await load_script("src/ps4/constants.js");
        await load_script("src/ps4/userland.js");
        break;

      case 5:
        logger.error("PS5 is not supported.");
        return;

      default:
        logger.error(`Unsupported console: ${version.console}`);
        return;
    }

    logger.info("Userland Loaded");

    let rw = undefined;

    if (arw.master === undefined) {
      rw = await init_rw();
    }

    init_arw(rw);
    init_rop();
    init_syscalls();

    logger.info("Preparing Kernel Exploit...");

    await load_script("src/loader.js");
    await load_script("src/workers.js");

    switch (version.console) {
      case 4:
        await load_script("src/ps4/kernel.js");
        break;
    }

    await load_script(`src/${exploitChain}.js`);

    logger.info(`Running ${exploitChain.toUpperCase()}...`);

    try {

      if (exploitChain == "lapse") {

        init();
        await setup();
        await double_free_reqs2();
        leak_kaddrs();
        double_free_reqs1();
        make_karw();

        inc_karw_pipe_refcnt();

        remove_pktinfo_from_so(pktopts_twins[0]);

        remove_rthdr_from_so(pktopts_twins[1]);
        remove_rthdr_from_so(rthdr_twins[0]);

      } else {

        init();
        await setup();
        await ucred_triple_free();
        leak_kqueue();
        await make_karw();

        inc_karw_pipe_refcnt();

        for (let i = 0; i < triplets.length; i++) {
          remove_rthdr_from_so(triplets[i]);
        }

        remove_uaf_file();

      }

    } finally {

      cleanup();

    }

    find_all_proc();

    if (fn.setuid.invoke(0) === -1) {

      logger.info("Applying Jailbreak...");

      jailbreak();

      const kpatches_rsp = await fetch(`src/ps4/patches/${constants.KPATCH}`);
      const kpatches_buf = await kpatches_rsp.arrayBuffer();
      const kpatches_u8 = new Uint8Array(kpatches_buf);

      kernel_patches(kpatches_u8);

      const bin_rsp = await fetch("src/payload.bin");
      const bin_buf = await bin_rsp.arrayBuffer();
      const bin_u8 = new Uint8Array(bin_buf);

      load_bin(bin_u8);

      logger.info("");
      logger.info("====================================");
      logger.info(" Jailbreak Completed Successfully ");
      logger.info(" Enjoy!");
      logger.info("====================================");

    } else {

      logger.info("System already jailbroken.");

    }

  } catch (e) {

    logger.error(e.message);
    logger.error(e.stack);

  }

}